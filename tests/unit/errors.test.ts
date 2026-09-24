import { expect, it } from 'vitest'
import { shouldRenderQr } from '../../src/ui/qr.js'
import { formatError, PeekError } from '../../src/utils/errors.js'

it('formats expected errors with an actionable hint and no stack', () => {
  const error = new PeekError(
    'DEV_SCRIPT_NOT_FOUND',
    'No dev script was found.',
    'Add scripts.dev to package.json.',
    new Error('internal detail'),
  )
  expect(formatError(error)).toBe(
    'No dev script was found.\n\nAdd scripts.dev to package.json.',
  )
  expect(formatError(error)).not.toContain('internal detail')
  expect(formatError(error, true)).toContain('Details: internal detail')
})

it('renders QR only when the terminal is interactive and large enough', () => {
  expect(shouldRenderQr('auto', true, 80, 30, 40, 20)).toBe(true)
  expect(shouldRenderQr('on', false, 80, 30, 40, 20)).toBe(false)
  expect(shouldRenderQr('on', true, 20, 30, 40, 20)).toBe(false)
  expect(shouldRenderQr('off', true, 80, 30, 40, 20)).toBe(false)
})
