import type { Readable } from 'node:stream'
import { execa } from 'execa'
import type { DevCommand } from './dev-command.js'

export interface ProcessExit {
  exitCode: number | null
  failed: boolean
  spawnFailed: boolean
  message?: string
}

export interface DevProcess {
  pid: number | undefined
  stdout: Readable
  stderr: Readable
  exit: Promise<ProcessExit>
  kill: (signal: NodeJS.Signals) => void
}

export function spawnDev(command: DevCommand, cwd: string): DevProcess {
  const child = execa(command.file, command.args, {
    cwd,
    env: process.env,
    stdin: 'inherit',
    stdout: 'pipe',
    stderr: 'pipe',
    buffer: false,
    reject: false,
    killDescendants: true,
    cleanup: true,
  })
  if (!child.stdout || !child.stderr) {
    throw new Error('Development server output streams were unavailable')
  }
  return {
    pid: child.pid,
    stdout: child.stdout,
    stderr: child.stderr,
    exit: child.then(
      (result): ProcessExit => ({
        exitCode: result.exitCode ?? null,
        failed: result.failed,
        spawnFailed:
          result.failed &&
          result.exitCode === undefined &&
          result.signal === undefined &&
          !result.timedOut &&
          !result.isCanceled,
        ...(result.shortMessage ? { message: result.shortMessage } : {}),
      }),
    ),
    kill: (signal) => {
      child.kill(signal)
    },
  }
}
