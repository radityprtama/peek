import { createConsola } from 'consola'
import pc from 'picocolors'
import type { QrMode } from './qr.js'
import { renderQr } from './qr.js'

const logger = createConsola({
  reporters: [
    {
      log(entry) {
        const symbol =
          entry.type === 'success'
            ? pc.green('✓')
            : entry.type === 'error'
              ? pc.red('✗')
              : pc.cyan('·')
        const stream = entry.type === 'error' ? process.stderr : process.stdout
        stream.write(`${symbol} ${entry.args.map(String).join(' ')}\n`)
      },
    },
  ],
})

export class TerminalOutput {
  constructor(private readonly qrMode: QrMode) {}

  title(): void {
    process.stdout.write(`\n${pc.bold('Peek')}\n\n`)
  }

  info(message: string): void {
    logger.info(message)
  }

  success(message: string): void {
    logger.success(message)
  }

  diagnostic(line: string): void {
    logger.info(pc.dim(`[cloudflared] ${line}`))
  }

  childOutput(stream: 'stdout' | 'stderr', text: string): void {
    if (stream === 'stderr') process.stderr.write(text)
    else process.stdout.write(text)
  }

  ready(localUrl: string, publicUrl: string): void {
    this.success('Tunnel connected')
    process.stdout.write(`\nLocal   ${localUrl}\nPublic  ${publicUrl}\n`)
    renderQr(publicUrl, this.qrMode)
    process.stdout.write('\nPress Ctrl+C to stop\n')
  }

  error(message: string): void {
    logger.error(message)
  }
}
