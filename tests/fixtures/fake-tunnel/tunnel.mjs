const mode = process.argv.includes('crash') ? 'crash' : 'ready'

if (mode === 'crash') {
  console.error('fake tunnel network failure')
  process.exit(1)
}

setTimeout(() => {
  console.error('https://fixture-peek.trycloudflare.com')
  if (process.argv.includes('later-crash'))
    setTimeout(() => process.exit(1), 50)
}, 25)

setInterval(() => {}, 1000)
process.on('SIGTERM', () => process.exit(0))
process.on('SIGINT', () => process.exit(0))
