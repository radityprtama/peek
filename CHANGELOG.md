# Changelog

## 0.1.1 — 2026-09-24

- Release Peek under a new npm version after `0.1.0` was already published.
- Normalize the executable path in package metadata and verify the installed
  `peek` command in the package smoke test.

## 0.1.0 — 2026-09-24

- Start a local `dev` script with pnpm, npm, Yarn, or Bun, or run an explicit
  executable with `peek -- <command>`.
- Detect and verify a reachable local server port before tunneling it.
- Download and verify a pinned Cloudflare `cloudflared` binary on first use.
- Create a temporary HTTPS Quick Tunnel and optionally display a terminal QR
  code.
- Stop the development server and tunnel together on exit or failure.
