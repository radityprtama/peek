import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
import { afterEach, expect, it, vi } from 'vitest'
import { Lifecycle } from '../../src/core/lifecycle.js'
import { runPeek } from '../../src/core/run.js'
import {
  CloudflareProvider,
  type TunnelChild,
} from '../../src/tunnel/cloudflare.js'

const serverFile = fileURLToPath(
  new URL('../fixtures/fake-server/server.mjs', import.meta.url),
)
const tunnelFile = fileURLToPath(
  new URL('../fixtures/fake-tunnel/tunnel.mjs', import.meta.url),
)
const lifecycles: Lifecycle[] = []
const tunnelPids: number[] = []

afterEach(async () => {
  await Promise.all(lifecycles.splice(0).map((lifecycle) => lifecycle.stop()))
})

function fakeProvider(mode = 'ready'): CloudflareProvider {
  return new CloudflareProvider('fake', () => {
    const child = execa(process.execPath, [tunnelFile, mode], {
      stdout: 'pipe',
      stderr: 'pipe',
      reject: false,
      killDescendants: true,
      buffer: false,
    })
    if (!child.stdout || !child.stderr)
      throw new Error('Missing tunnel streams')
    if (child.pid) tunnelPids.push(child.pid)
    return {
      stdout: child.stdout,
      stderr: child.stderr,
      exit: child.then((result) => ({ exitCode: result.exitCode ?? null })),
      kill: (signal) => {
        child.kill(signal)
      },
    } satisfies TunnelChild
  })
}

it('starts a fake server and tunnel and cleans both on cancellation', async () => {
  const lifecycle = new Lifecycle()
  lifecycles.push(lifecycle)
  const provider = fakeProvider()
  let ready: (value: { localUrl: string; publicUrl: string }) => void = () => {}
  const readyPromise = new Promise<{ localUrl: string; publicUrl: string }>(
    (resolve) => {
      ready = resolve
    },
  )
  let devPid: number | undefined
  const running = runPeek({
    cwd: process.cwd(),
    command: { file: process.execPath, args: [serverFile] },
    lifecycle,
    provider,
    onReady: ready,
    onDevOutput: (_stream, text) => {
      const match = /PID: (\d+)/.exec(text)
      if (match?.[1]) devPid = Number(match[1])
    },
  })
  const urls = await readyPromise
  expect(urls.localUrl).toMatch(/^http:\/\/localhost:\d+$/)
  expect(urls.publicUrl).toBe('https://fixture-peek.trycloudflare.com')
  lifecycle.requestStop()
  await expect(running).resolves.toBeUndefined()
  expect(lifecycle.isStopped).toBe(true)
  expect(devPid).toBeTypeOf('number')
  expect(isRunning(devPid ?? 0)).toBe(false)
  expect(isRunning(tunnelPids.at(-1) ?? 0)).toBe(false)
})

it('does not connect a tunnel when the dev server crashes', async () => {
  const lifecycle = new Lifecycle()
  lifecycles.push(lifecycle)
  const provider = fakeProvider()
  const connect = vi.spyOn(provider, 'connect')
  await expect(
    runPeek({
      cwd: process.cwd(),
      command: { file: process.execPath, args: [serverFile, 'crash'] },
      lifecycle,
      provider,
      onDevOutput: () => {},
    }),
  ).rejects.toMatchObject({ code: 'SERVER_START_ERROR' })
  expect(connect).not.toHaveBeenCalled()
  expect(lifecycle.isStopped).toBe(true)
})

it('identifies an unavailable dev command', async () => {
  const lifecycle = new Lifecycle()
  lifecycles.push(lifecycle)
  await expect(
    runPeek({
      cwd: process.cwd(),
      command: { file: 'peek-command-that-does-not-exist', args: [] },
      lifecycle,
      provider: fakeProvider(),
      onDevOutput: () => {},
    }),
  ).rejects.toMatchObject({ code: 'PACKAGE_MANAGER_ERROR' })
})

it('stops a hung server during readiness', async () => {
  const lifecycle = new Lifecycle()
  lifecycles.push(lifecycle)
  const running = runPeek({
    cwd: process.cwd(),
    command: { file: process.execPath, args: [serverFile, 'hang'] },
    lifecycle,
    provider: fakeProvider(),
    onDevOutput: () => {},
  })
  await new Promise((resolve) => setTimeout(resolve, 100))
  lifecycle.requestStop()
  await expect(running).resolves.toBeUndefined()
  expect(lifecycle.isStopped).toBe(true)
})

it('stops the dev server when the tunnel exits', async () => {
  const lifecycle = new Lifecycle()
  lifecycles.push(lifecycle)
  await expect(
    runPeek({
      cwd: process.cwd(),
      command: { file: process.execPath, args: [serverFile] },
      lifecycle,
      provider: fakeProvider('later-crash'),
      onDevOutput: () => {},
    }),
  ).rejects.toMatchObject({ code: 'TUNNEL_CONNECTION_ERROR' })
  expect(lifecycle.isStopped).toBe(true)
})

function isRunning(pid: number): boolean {
  if (pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}
