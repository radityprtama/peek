import { expect, it } from 'vitest'
import {
  selectDevCommand,
  selectExplicitCommand,
} from '../../src/core/dev-command.js'

it('selects the manager run command without a shell', () => {
  expect(selectDevCommand('pnpm')).toEqual({
    file: 'pnpm',
    args: ['run', 'dev'],
  })
  expect(selectDevCommand('bun')).toEqual({ file: 'bun', args: ['run', 'dev'] })
})

it('preserves explicit argv boundaries', () => {
  expect(selectExplicitCommand(['pnpm', 'dev', '--port', '5173'])).toEqual({
    file: 'pnpm',
    args: ['dev', '--port', '5173'],
  })
})

it('rejects an empty explicit command', () => {
  expect(() => selectExplicitCommand([])).toThrow()
})
