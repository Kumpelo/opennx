# OpenNX

Open source Nintendo Switch homebrew toolkit.

<p align="left">
  <a href="https://github.com/Kumpelo/opennx/actions"><img src="https://img.shields.io/github/actions/workflow/status/Kumpelo/opennx/ci.yml?branch=main&logo=github&label=CI" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-GPLv3-blue.svg" alt="License"></a>
  <a href="https://github.com/Kumpelo/opennx/releases"><img src="https://img.shields.io/github/v/release/Kumpelo/opennx?include_prereleases&logo=github" alt="Release"></a>
</p>

Built with **Tauri** + **React** + **TypeScript** + **Rust**.

## Features

- **Payload Manager** — Add, inject, download and delete RCM payloads
- **Updater** — Keep Atmosphere, Hekate and homebrew up to date
- **SD Manager** — Analyze and manage your SD card
- **USB Injection** — Inject payloads via RCM (VID 0955, PID 7321)

## Development

```bash
pnpm install
pnpm tauri dev
```

## Build

```bash
pnpm tauri build
```

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE).
