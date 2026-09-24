#!/usr/bin/env node

import { defineCommand, runMain } from 'citty'
import packageJson from '../package.json' with { type: 'json' }
import { ensureCloudflared } from './cloudflared/binary.js'
import {
  type DevCommand,
  selectDevCommand,
  selectExplicitCommand,
} from './core/dev-command.js'
import { Lifecycle } from './core/lifecycle.js'
import { parsePort } from './core/port.js'
import { readProject } from './core/project.js'
import { runPeek } from './core/run.js'
import { CloudflareProvider } from './tunnel/cloudflare.js'
import { TerminalOutput } from './ui/output.js'
import type { QrMode } from './ui/qr.js'
import { formatError, PeekError } from './utils/errors.js'

const raw = process.argv.slice(2)
const boundary = raw.indexOf('--')
const normalArgs = boundary === -1 ? raw : raw.slice(0, boundary)
const commandArgs = normalArgs[0] === 'dev' ? normalArgs.slice(1) : normalArgs
const explicitArgv = boundary === -1 ? undefined : raw.slice(boundary + 1)

const flags = {
  port: {
    type: 'string',
    description: 'Port opened by the development server',
  },
  provider: { type: 'string', description: 'Tunnel provider (cloudflare)' },
  qr: { type: 'boolean', description: 'Show a terminal QR code when it fits' },
  verbose: { type: 'boolean', description: 'Show diagnostic details' },
} as const

interface CliArgs {
  _: string[]
  port: string | undefined
  provider: string | undefined
  qr: boolean | undefined
  verbose: boolean | undefined
}

async function execute(args: CliArgs): Promise<void> {
  const qrMode: QrMode =
    args.qr === true ? 'on' : args.qr === false ? 'off' : 'auto'
  const output = new TerminalOutput(qrMode)
  const lifecycle = new Lifecycle()
  lifecycle.installSignals()
  try {
    const unknownFlags = Object.keys(args).filter(
      (key) => !['_', 'port', 'provider', 'qr', 'verbose'].includes(key),
    )
    if (unknownFlags.length > 0) {
      throw new PeekError(
        'USAGE_ERROR',
        `Unknown option: --${unknownFlags[0]}`,
        'Use peek --help to see available flags.',
      )
    }
    if (args._.length > 0) {
      throw new PeekError(
        'USAGE_ERROR',
        `Unknown command or argument: ${args._.join(' ')}`,
        'Use peek --help to see available commands and flags.',
      )
    }
    if (args.provider !== undefined && args.provider !== 'cloudflare') {
      throw new PeekError(
        'USAGE_ERROR',
        `Provider ${JSON.stringify(args.provider)} is not available in Peek v0.1.0.`,
        'Use --provider cloudflare or omit the flag.',
      )
    }
    if (args.port !== undefined && typeof args.port !== 'string') {
      throw new PeekError(
        'USAGE_ERROR',
        '--port needs a number.',
        'For example: peek --port 3000',
      )
    }
    const explicitPort =
      args.port === undefined ? undefined : parsePort(args.port)
    let project: Awaited<ReturnType<typeof readProject>> | undefined
    let command: DevCommand
    if (explicitArgv === undefined) {
      project = await readProject(process.cwd())
      command = selectDevCommand(project.packageManager)
    } else {
      command = selectExplicitCommand(explicitArgv)
    }

    output.title()
    if (project) output.success(`${project.packageManager} project`)
    output.info('Preparing tunnel engine...')
    const binaryPath = await ensureCloudflared({
      signal: lifecycle.signal,
      onDownload: () => output.info('Downloading cloudflared...'),
    })
    output.success('Tunnel engine ready')
    const provider = new CloudflareProvider(
      binaryPath,
      undefined,
      args.verbose ? (line) => output.diagnostic(line) : undefined,
    )
    await runPeek({
      cwd: process.cwd(),
      command,
      ...(explicitPort === undefined ? {} : { explicitPort }),
      lifecycle,
      provider,
      onState: (state) => {
        if (state === 'starting') {
          output.info(
            project
              ? `Starting ${project.packageManager} dev...`
              : 'Starting command...',
          )
        } else if (state === 'waiting') {
          output.info('Waiting for server...')
        } else {
          output.info('Connecting tunnel...')
        }
      },
      onDevOutput: (stream, text) => output.childOutput(stream, text),
      onReady: ({ localUrl, publicUrl }) => output.ready(localUrl, publicUrl),
    })
    if (lifecycle.signalExitCode !== undefined)
      process.exitCode = lifecycle.signalExitCode
  } catch (error) {
    if (lifecycle.wasRequested) {
      process.exitCode = lifecycle.signalExitCode ?? 130
    } else {
      output.error(formatError(error, args.verbose === true))
      process.exitCode =
        error instanceof PeekError && error.code === 'USAGE_ERROR' ? 2 : 1
    }
  } finally {
    await lifecycle.stop()
  }
}

const main = defineCommand({
  meta: {
    name: 'peek',
    version: packageJson.version,
    description:
      'Run your dev server. Share it instantly. (peek dev is an alias)',
  },
  args: flags,
  run: ({ args }) => execute(args),
})

await runMain(main, { rawArgs: commandArgs })
