# Tunnel providers

v0.1 ships one functional provider: Cloudflare Quick Tunnel. The interface in
`src/tunnel/types.ts` separates the tunnel process from project and server
detection:

```ts
interface TunnelProvider {
  readonly name: string
  connect(options: { port: number; signal: AbortSignal }): Promise<{
    url: string
    exited: Promise<{ exitCode: number | null }>
  }>
  disconnect(): Promise<void>
  forceDisconnect?(): void
}
```

The lifecycle registers a provider before connection, passes only the selected
port, and calls `disconnect()` before stopping the dev server. The exit promise
allows Peek to close the dev server if a connected tunnel dies. A future
provider would implement this contract, be selected by the CLI, and receive
the same verified port. It should not change project discovery or server
readiness.

Cloudflare's implementation starts the Peek managed `cloudflared` binary with
`tunnel --url http://127.0.0.1:<port>`, reads both output streams, and accepts
only a valid `https://<name>.trycloudflare.com` URL. It has a startup deadline
and preserves diagnostics for `--verbose`. Quick Tunnel URLs are temporary and
Cloudflare does not guarantee uptime. A `~/.cloudflared/config.yaml` can
prevent Quick Tunnels from working; Peek reports the remedy without changing
the user's Cloudflare files. See [Cloudflare's
documentation](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/).

Tailscale Funnel, LocalTunnel, ngrok, and a Peek relay are possible future
implementations. They are examples of how this seam could be used, not v0.1
features or commitments. An additional provider must have offline tests for
URL validation, early exit, cancellation, and cleanup before it becomes a CLI
choice.
