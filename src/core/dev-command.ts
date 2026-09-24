import { resolveCommand } from 'package-manager-detector/commands'
import { PeekError } from '../utils/errors.js'
import type { PackageManager } from './project.js'

export interface DevCommand {
  file: string
  args: string[]
}

export function selectDevCommand(manager: PackageManager): DevCommand {
  const resolved = resolveCommand(manager, 'run', ['dev'])
  if (!resolved) {
    throw new PeekError(
      'PACKAGE_MANAGER_ERROR',
      `Peek cannot build a dev command for ${manager}.`,
      'Use peek -- <command> to specify the command explicitly.',
    )
  }
  return { file: resolved.command, args: resolved.args }
}

export function selectExplicitCommand(argv: readonly string[]): DevCommand {
  const [file, ...args] = argv
  if (!file) {
    throw new PeekError(
      'USAGE_ERROR',
      'No command followed --.',
      'For example: peek -- pnpm dev',
    )
  }
  return { file, args }
}
