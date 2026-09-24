import { PassThrough } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'
import {
  CloudflareProvider,
  parseTunnelUrl,
  type TunnelChild,
} from '../../src/tunnel/cloudflare.js'

describe('Cloudflare URL parsing', () => {
  it('extracts a Quick Tunnel URL from decorated output', () => {
    expect(parseTunnelUrl('| https://blue-green.trycloudflare.com |')).toBe(
      'https://blue-green.trycloudflare.com',
    )
  })

  it.each([
    'http://blue-green.trycloudflare.com',
    'https://blue-green.trycloudflare.com.evil.test',
    'https://foo.bar.trycloudflare.com',
    'https://blue-green.trycloudflare.com/path',
    'https://blue-green.trycloudflare.com:443',
    'https://localhost:3000',
  ])('rejects %s', (line) => {
    expect(parseTunnelUrl(line)).toBeUndefined()
  })
})

function fakeChild(): {
  child: TunnelChild
  stdout: PassThrough
  stderr: PassThrough
  exit: (code: number) => void
  kill: ReturnType<typeof vi.fn>
} {
  const stdout = new PassThrough()
  const stderr = new PassThrough()
  let resolveExit: (value: { exitCode: number }) => void = () => {}
  const exit = new Promise<{ exitCode: number }>((resolve) => {
    resolveExit = resolve
  })
  const kill = vi.fn()
  return {
    child: { stdout, stderr, exit, kill },
    stdout,
    stderr,
    exit: (code) => resolveExit({ exitCode: code }),
    kill,
  }
}

it('waits for a valid public URL on stderr', async () => {
  const fake = fakeChild()
  const provider = new CloudflareProvider('/tmp/cloudflared', () => fake.child)
  const connecting = provider.connect({
    port: 3000,
    signal: new AbortController().signal,
  })
  fake.stderr.write('starting\n')
  await new Promise((resolve) => setTimeout(resolve, 5))
  fake.stderr.write('https://rapid-river.trycloudflare.com\n')
  const connection = await connecting
  expect(connection.url).toBe('https://rapid-river.trycloudflare.com')
  fake.exit(0)
  await expect(connection.exited).resolves.toEqual({ exitCode: 0 })
})

it('reports an early tunnel exit', async () => {
  const fake = fakeChild()
  const provider = new CloudflareProvider('/tmp/cloudflared', () => fake.child)
  const connecting = provider.connect({
    port: 3000,
    signal: new AbortController().signal,
  })
  fake.stderr.write('network unreachable\n')
  fake.exit(1)
  await expect(connecting).rejects.toMatchObject({
    code: 'TUNNEL_CONNECTION_ERROR',
  })
})
