import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { detectPackageManager, readProject } from '../../src/core/project.js'
import { PeekError } from '../../src/utils/errors.js'

const fixture = (name: string): string =>
  fileURLToPath(new URL(`../fixtures/${name}/`, import.meta.url))

describe('package manager detection', () => {
  it('prioritizes packageManager over a lockfile', () => {
    expect(detectPackageManager('pnpm@10.0.0', ['package-lock.json'])).toBe(
      'pnpm',
    )
  })

  it.each([
    ['pnpm-lock.yaml', 'pnpm'],
    ['package-lock.json', 'npm'],
    ['yarn.lock', 'yarn'],
    ['bun.lock', 'bun'],
    ['bun.lockb', 'bun'],
  ] as const)('maps %s to %s', (lockfile, manager) => {
    expect(detectPackageManager(undefined, [lockfile])).toBe(manager)
  })

  it('treats bun.lock and bun.lockb as one manager', () => {
    expect(detectPackageManager(undefined, ['bun.lock', 'bun.lockb'])).toBe(
      'bun',
    )
  })

  it('falls back to npm when no evidence exists', () => {
    expect(detectPackageManager(undefined, [])).toBe('npm')
  })

  it('rejects conflicting lockfiles', () => {
    expect(() =>
      detectPackageManager(undefined, ['pnpm-lock.yaml', 'yarn.lock']),
    ).toThrow(PeekError)
  })

  it('rejects an unsupported declared manager', () => {
    expect(() => detectPackageManager('deno@2.0.0', [])).toThrow(PeekError)
  })
})

describe('project inspection', () => {
  it.each([
    ['pnpm-project', 'pnpm'],
    ['npm-project', 'npm'],
    ['yarn-project', 'yarn'],
    ['bun-project', 'bun'],
  ] as const)('reads the %s fixture', async (name, manager) => {
    const project = await readProject(fixture(name))
    expect(project.packageManager).toBe(manager)
    expect(project.devScript).toBeTruthy()
  })

  it('rejects a missing dev script', async () => {
    await expect(readProject(fixture('no-dev-script'))).rejects.toMatchObject({
      code: 'DEV_SCRIPT_NOT_FOUND',
    })
  })

  it('rejects a directory without package.json', async () => {
    await expect(readProject(fixture('fake-server'))).rejects.toMatchObject({
      code: 'PROJECT_NOT_FOUND',
    })
  })
})
