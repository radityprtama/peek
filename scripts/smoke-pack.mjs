import { spawnSync } from 'node:child_process'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const temporary = await mkdtemp(join(tmpdir(), 'peek-pack-'))
const installDir = join(temporary, 'install')
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const packageJson = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8'),
)

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    timeout: 180_000,
    maxBuffer: 10_000_000,
    shell: process.platform === 'win32',
  })
  if (result.error || result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed:\n${result.stdout ?? ''}${result.stderr ?? ''}`,
      { cause: result.error },
    )
  }
  return result.stdout
}

try {
  run(npm, ['pack', '--pack-destination', temporary])
  const tarballs = (await readdir(temporary)).filter((name) =>
    name.endsWith('.tgz'),
  )
  if (tarballs.length !== 1) {
    throw new Error(`Expected one package tarball, found ${tarballs.length}`)
  }
  run(npm, [
    'install',
    '--prefix',
    installDir,
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    join(temporary, tarballs[0]),
  ])
  const cli = join(
    installDir,
    'node_modules',
    '@radityprtama',
    'peek',
    'dist',
    'cli.js',
  )
  const version = run(process.execPath, [cli, '--version']).trim()
  if (version !== packageJson.version) {
    throw new Error(`Packed CLI reported unexpected version: ${version}`)
  }
  const help = run(process.execPath, [cli, '--help'])
  if (!help.includes('peek')) {
    throw new Error('Packed CLI did not display help')
  }
  process.stdout.write(`Packed CLI smoke test passed (${version}).\n`)
} finally {
  await rm(temporary, { recursive: true, force: true })
}
