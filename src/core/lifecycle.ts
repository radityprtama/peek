import type { TunnelProvider } from '../tunnel/types.js'
import type { DevProcess } from './process.js'

export class Lifecycle {
  private readonly controller = new AbortController()
  private dev: DevProcess | undefined
  private provider: TunnelProvider | undefined
  private stopPromise: Promise<void> | undefined
  private requested = false
  private stopped = false
  private readonly onSigint = (): void => this.handleSignal('SIGINT')
  private readonly onSigterm = (): void => this.handleSignal('SIGTERM')
  signalExitCode: number | undefined

  get signal(): AbortSignal {
    return this.controller.signal
  }

  get isStopped(): boolean {
    return this.stopped
  }

  get wasRequested(): boolean {
    return this.requested
  }

  installSignals(): void {
    process.on('SIGINT', this.onSigint)
    process.on('SIGTERM', this.onSigterm)
  }

  setDev(dev: DevProcess): void {
    this.dev = dev
    if (this.controller.signal.aborted) dev.kill('SIGTERM')
  }

  setProvider(provider: TunnelProvider): void {
    this.provider = provider
    if (this.controller.signal.aborted)
      void provider.disconnect().catch(() => {})
  }

  requestStop(exitCode?: number): void {
    if (this.requested) {
      this.forceStop()
      return
    }
    this.requested = true
    this.signalExitCode = exitCode
    this.controller.abort(new Error('Peek was stopped'))
    void this.stop().catch(() => {})
  }

  stop(): Promise<void> {
    if (this.stopPromise) return this.stopPromise
    this.stopPromise = this.stopChildren()
    return this.stopPromise
  }

  private async stopChildren(): Promise<void> {
    try {
      await this.provider?.disconnect()
    } finally {
      const dev = this.dev
      if (dev) {
        dev.kill('SIGTERM')
        if (!(await settlesWithin(dev.exit, 3_000))) {
          dev.kill('SIGKILL')
          await settlesWithin(dev.exit, 1_000)
        }
      }
      this.stopped = true
      process.off('SIGINT', this.onSigint)
      process.off('SIGTERM', this.onSigterm)
    }
  }

  private handleSignal(signal: 'SIGINT' | 'SIGTERM'): void {
    this.requestStop(signal === 'SIGINT' ? 130 : 143)
  }

  private forceStop(): void {
    this.provider?.forceDisconnect?.()
    this.dev?.kill('SIGKILL')
  }
}

async function settlesWithin(
  promise: Promise<unknown>,
  milliseconds: number,
): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), milliseconds)
  })
  const settled = promise.then(
    () => true as const,
    () => true as const,
  )
  const result = await Promise.race([settled, timeout])
  if (timer) clearTimeout(timer)
  return result
}
