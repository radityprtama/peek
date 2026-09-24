# CLI

```text
peek [options]
peek dev [options]
peek [options] -- <executable> [arguments...]
```

`peek dev` is an alias for `peek`. There is no `peek run` command in v0.1.
The `--` form keeps executable and argument boundaries intact and never uses
a shell.

| Option | Behavior |
| --- | --- |
| `--port <number>` | Select port 1–65535. Peek fails if it was occupied before startup. |
| `--provider cloudflare` | Select the sole provider. Any other value fails. |
| `--qr` | Request QR output when stdout is an interactive, sufficiently large terminal. |
| `--no-qr` | Turn QR output off. |
| `--verbose` | Show Cloudflare log lines and error causes. |
| `--help` | Show usage without starting a process. |
| `--version` | Show package version. |

Without `--qr` or `--no-qr`, Peek shows a QR code when terminal size permits.
The HTTPS URL always appears as text. `--qr` cannot force an unusable QR into
a narrow or noninteractive terminal.

## Examples

```sh
peek
peek dev
peek --port 5173
peek --qr
peek --no-qr
peek --verbose
peek --help
peek --version
peek -- npm start
peek --port 3000 -- node server.js
```

Flags go before `--`. With the explicit form, Peek starts the named executable
directly in the current working directory; it does not require `package.json`.
For the normal form, package manager priority is `packageManager` in
`package.json`, then one recognized lockfile, then npm. Conflicting lockfiles
without `packageManager` fail with instructions to resolve the ambiguity.

Port selection follows:

```text
--port
  ↓
unique local URL or port announced by the dev process
  ↓
child-owned listening socket
  ↓
unique common port that opened after startup
  ↓
actionable detection error
```

Each candidate must accept a TCP connection on `127.0.0.1`. An explicit port
already in use before startup is rejected. Peek does not blindly assume port
3000. A silent server on an unusual port may require `--port`.
