import { expect, it } from 'vitest'
import { shouldRenderQr } from '../../src/ui/qr.js'

it('renders a QR only when an interactive terminal has room', () => {
  expect(shouldRenderQr('auto', true, 80, 40, 32, 16)).toBe(true)
  expect(shouldRenderQr('on', false, 80, 40, 32, 16)).toBe(false)
  expect(shouldRenderQr('on', true, 30, 40, 32, 16)).toBe(false)
  expect(shouldRenderQr('on', true, 80, 20, 32, 16)).toBe(false)
  expect(shouldRenderQr('off', true, 80, 40, 32, 16)).toBe(false)
})
