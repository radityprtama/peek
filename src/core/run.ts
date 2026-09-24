import type { TunnelProvider } from '../tunnel/types.js'
import { PeekError } from '../utils/errors.js'
import type { DevCommand } from './dev-command.js'
import type { Lifecycle } from './lifecycle.js'
import { type ProcessExit, spawnDev } from './process.js'
import {
  captureBaselinePorts,
  inspectChildListeningPorts,
  PortSignals,
  waitForServer,
} from './server.js'

export interface RunOptions {
  cwd: string
  command: DevCommand
  explicitPort?: number
  lifecycle: Lifecycle
  provider: TunnelProvider
  onState?: (state: 'starting' | 'waiting' | 'connecting') => void
  onDevOutput?: (stream: 'stdout' | 'stderr', text: string) => void
  onReady?: (urls: { localUrl: string; publicUrl: string }) => void
}

export async function runPeek(options: RunOptions): Promise<void> {
  const { cwd, command, explicitPort, lifecycle, provider } = options
  const signal = lifecycle.signal
  try {
    signal.throwIfAborted()
    const baselineOpen = await captureBaselinePorts(explicitPort)
    signal.throwIfAborted()
    options.onState?.('starting')
    const dev = spawnDev(command, cwd)
    lifecycle.setDev(dev)
    const signals = new PortSignals()
    dev.stdout.on('data', (chunk: Buffer | string) => {
      const text = chunk.toString()
      signals.addChunk(text)
      options.onDevOutput?.('stdout', text)
    })
    dev.stderr.on('data', (chunk: Buffer | string) => {
      const text = chunk.toString()
      signals.addChunk(text)
      options.onDevOutput?.('stderr', text)
    })
    let devExited = false
    let devExit: ProcessExit | undefined
    void dev.exit.then((exit) => {
      devExited = true
      devExit = exit
    })

    options.onState?.('waiting')
    let port: number
    try {
      port = await waitForServer({
        ...(explicitPort === undefined ? {} : { explicitPort }),
        signals,
        baselineOpen,
        signal,
        hasExited: () => devExited,
        inspectPorts: () => inspectChildListeningPorts(dev.pid),
      })
    } catch (error) {
      if (
        error instanceof PeekError &&
        error.code === 'SERVER_START_ERROR' &&
        /ENOENT|EACCES/.test(devExit?.message ?? '')
      ) {
        throw new PeekError(
          'PACKAGE_MANAGER_ERROR',
          `Peek could not start ${command.file}.`,
          `Install ${command.file} or run an available command with peek -- <command>.`,
          devExit?.message,
        )
      }
      throw error
    }
    signal.throwIfAborted()
    options.onState?.('connecting')
    lifecycle.setProvider(provider)
    const connection = await provider.connect({ port, signal })
    options.onReady?.({
      localUrl: `http://localhost:${port}`,
      publicUrl: connection.url,
    })

    let removeAbort: (() => void) | undefined
    const cancelled = new Promise<{ kind: 'cancel' }>((resolve) => {
      const onAbort = (): void => resolve({ kind: 'cancel' })
      if (signal.aborted) onAbort()
      else signal.addEventListener('abort', onAbort, { once: true })
      removeAbort = () => signal.removeEventListener('abort', onAbort)
    })
    const outcome = await Promise.race([
      dev.exit.then((exit) => ({ kind: 'dev' as const, exit })),
      connection.exited.then((exit) => ({ kind: 'tunnel' as const, exit })),
      cancelled,
    ])
    removeAbort?.()
    if (outcome.kind === 'cancel') return
    if (outcome.kind === 'dev') {
      throw new PeekError(
        'SERVER_START_ERROR',
        `Development server exited with code ${outcome.exit.exitCode ?? 'unknown'}.`,
        'Check the server output above and restart Peek after fixing the problem.',
        outcome.exit.message,
      )
    }
    throw new PeekError(
      'TUNNEL_CONNECTION_ERROR',
      `Cloudflare tunnel stopped with code ${outcome.exit.exitCode ?? 'unknown'}.`,
      'Check your network connection and retry with --verbose.',
    )
  } catch (error) {
    if (!lifecycle.wasRequested) throw error
  } finally {
    await lifecycle.stop()
  }
}
