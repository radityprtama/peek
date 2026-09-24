import { PeekError } from '../utils/errors.js'

export const CLOUDFLARED_VERSION = '2026.9.1'

export interface CloudflaredAsset {
  name: string
  url: string
  assetSha256: string
  binarySha256: string
  archive: boolean
}

const assets = {
  'linux-x64': {
    name: 'cloudflared-linux-amd64',
    assetSha256:
      '03f1f25d1cc93b9ad6c60569d44060bc4f17ed97075760ed8cfca4b12dcd68cc',
    binarySha256:
      '03f1f25d1cc93b9ad6c60569d44060bc4f17ed97075760ed8cfca4b12dcd68cc',
    archive: false,
  },
  'linux-arm64': {
    name: 'cloudflared-linux-arm64',
    assetSha256:
      '3d97437c71848bd8df68041e12436b484a661d95073ea1937f01a845ce88faa3',
    binarySha256:
      '3d97437c71848bd8df68041e12436b484a661d95073ea1937f01a845ce88faa3',
    archive: false,
  },
  'darwin-x64': {
    name: 'cloudflared-darwin-amd64.tgz',
    assetSha256:
      'ff0d3b51d5ff70eceef89d6b32145fee985018a2174596a5dbe405e2766e2ac4',
    binarySha256:
      '1ea07ae775b03236bd6be18ca1848d6bdc4af2f4f3bce398823b5a36e5761b75',
    archive: true,
  },
  'darwin-arm64': {
    name: 'cloudflared-darwin-arm64.tgz',
    assetSha256:
      'c27ab8fd0aa489449e3d201eb02f957ef460a13b613662928b1b23394bf1bcfe',
    binarySha256:
      '9a0b19f67dc7a3011bc6b972c7ce06a5fcea8784ac6bd599ffa382ea4aeb5a6e',
    archive: true,
  },
  'win32-x64': {
    name: 'cloudflared-windows-amd64.exe',
    assetSha256:
      '2837888cc0f5d58f15b6dc478376de90b4d3ba5241c7947455d1e0a0df429712',
    binarySha256:
      '2837888cc0f5d58f15b6dc478376de90b4d3ba5241c7947455d1e0a0df429712',
    archive: false,
  },
} as const

export function selectCloudflaredAsset(
  platform: string,
  arch: string,
): CloudflaredAsset {
  const entry = assets[`${platform}-${arch}` as keyof typeof assets]
  if (!entry) {
    throw new PeekError(
      'CLOUDFLARED_INSTALL_ERROR',
      `Peek does not have a cloudflared binary for ${platform}/${arch}.`,
      'Use Linux or macOS x64/ARM64, or Windows x64.',
    )
  }
  return {
    ...entry,
    url: `https://github.com/cloudflare/cloudflared/releases/download/${CLOUDFLARED_VERSION}/${entry.name}`,
  }
}
