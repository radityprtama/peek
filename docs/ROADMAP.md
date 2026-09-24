# Roadmap

This is a list of ideas, not a promise or release schedule.

## v0.1

- Current-directory project and package manager detection
- Dev-server runner and verified port detection
- One Cloudflare Quick Tunnel and managed `cloudflared` binary
- Terminal QR code when it fits
- Coordinated process lifecycle and cleanup

## Possible v0.2

- Optional configuration file
- Broader framework output and socket detection
- Tailscale Funnel, LocalTunnel, or ngrok providers
- More process-detection coverage on Windows

## Future ideas

- Named previews and expiration controls
- Password protection
- Stable Peek URLs
- Custom relay infrastructure

Any future provider or relay must preserve the v0.1 rule that only the selected
local service is exposed and cleanup remains coordinated.
