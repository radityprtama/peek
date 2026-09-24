import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { ensureCloudflared } from '../../src/cloudflared/binary.js'
import type { CloudflaredAsset } from '../../src/cloudflared/platform.js'

const dirs: string[] = []

afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  )
})

function fakeAsset(bytes: Uint8Array): CloudflaredAsset {
  const digest = createHash('sha256').update(bytes).digest('hex')
  return {
    name: 'cloudflared-linux-amd64',
    url: 'https://github.com/cloudflare/cloudflared/releases/download/2026.9.1/cloudflared-linux-amd64',
    assetSha256: digest,
    binarySha256: digest,
    archive: false,
  }
}

async function cache(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'peek-binary-test-'))
  dirs.push(dir)
  return dir
}

it('downloads, verifies, and reuses a cached binary', async () => {
  const bytes = Buffer.from('fake cloudflared executable')
  const fetcher = vi.fn(async () => new Response(bytes, { status: 200 }))
  const options = { cacheDir: await cache(), asset: fakeAsset(bytes), fetcher }
  const path = await ensureCloudflared(options)
  expect(await readFile(path)).toEqual(bytes)
  expect(await ensureCloudflared(options)).toBe(path)
  expect(fetcher).toHaveBeenCalledTimes(1)
})

it('redownloads a corrupted cached binary', async () => {
  const bytes = Buffer.from('known binary')
  const fetcher = vi.fn(async () => new Response(bytes, { status: 200 }))
  const options = { cacheDir: await cache(), asset: fakeAsset(bytes), fetcher }
  const path = await ensureCloudflared(options)
  await writeFile(path, 'tampered')
  await ensureCloudflared(options)
  expect(await readFile(path)).toEqual(bytes)
  expect(fetcher).toHaveBeenCalledTimes(2)
})

it('rejects an asset whose checksum is wrong', async () => {
  const bytes = Buffer.from('wrong data')
  const fetcher = vi.fn(async () => new Response(bytes, { status: 200 }))
  const asset = fakeAsset(Buffer.from('expected data'))
  await expect(
    ensureCloudflared({ cacheDir: await cache(), asset, fetcher }),
  ).rejects.toMatchObject({
    code: 'CLOUDFLARED_INSTALL_ERROR',
  })
})
