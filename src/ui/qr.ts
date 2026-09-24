import qrcode from 'qrcode-terminal'

export type QrMode = 'auto' | 'on' | 'off'

export function shouldRenderQr(
  mode: QrMode,
  isTTY: boolean,
  columns: number | undefined,
  rows: number | undefined,
  qrWidth: number,
  qrHeight: number,
): boolean {
  if (mode === 'off' || !isTTY || !columns || !rows) return false
  return qrWidth + 2 <= columns && qrHeight + 8 <= rows
}

export function renderQr(url: string, mode: QrMode): void {
  if (mode === 'off' || !process.stdout.isTTY) return
  qrcode.generate(url, { small: true }, (qr) => {
    const lines = qr.split('\n').filter(Boolean)
    const width = Math.max(...lines.map((line) => line.length))
    if (
      shouldRenderQr(
        mode,
        Boolean(process.stdout.isTTY),
        process.stdout.columns,
        process.stdout.rows,
        width,
        lines.length,
      )
    ) {
      process.stdout.write(`\n${qr}\n`)
    }
  })
}
