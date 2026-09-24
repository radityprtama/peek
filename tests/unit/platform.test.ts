import { describe, expect, it } from 'vitest'
import {
  CLOUDFLARED_VERSION,
  selectCloudflaredAsset,
} from '../../src/cloudflared/platform.js'

describe('cloudflared platform mapping', () => {
  it('pins one release', () => {
    expect(CLOUDFLARED_VERSION).toBe('2026.9.1')
  })

  it.each([
    ['linux', 'x64', 'cloudflared-linux-amd64'],
    ['linux', 'arm64', 'cloudflared-linux-arm64'],
    ['darwin', 'x64', 'cloudflared-darwin-amd64.tgz'],
    ['darwin', 'arm64', 'cloudflared-darwin-arm64.tgz'],
    ['win32', 'x64', 'cloudflared-windows-amd64.exe'],
  ] as const)('maps %s %s to %s', (platform, arch, name) => {
    const asset = selectCloudflaredAsset(platform, arch)
    expect(asset.name).toBe(name)
    expect(asset.assetSha256).toMatch(/^[0-9a-f]{64}$/)
    expect(asset.binarySha256).toMatch(/^[0-9a-f]{64}$/)
    expect(asset.url).toBe(
      `https://github.com/cloudflare/cloudflared/releases/download/2026.9.1/${name}`,
    )
  })

  it('rejects unsupported systems', () => {
    expect(() => selectCloudflaredAsset('freebsd', 'x64')).toThrow()
    expect(() => selectCloudflaredAsset('win32', 'arm64')).toThrow()
  })
})
