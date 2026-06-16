# OpenNX

Open source Nintendo Switch homebrew maintenance toolkit.

<p align="left">
  <a href="https://github.com/Kumpelo/opennx/actions"><img src="https://img.shields.io/github/actions/workflow/status/Kumpelo/opennx/ci.yml?branch=main&logo=github&label=CI" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-GPLv3-blue.svg" alt="License"></a>
  <a href="https://github.com/Kumpelo/opennx/releases"><img src="https://img.shields.io/github/v/release/Kumpelo/opennx?include_prereleases&logo=github" alt="Release"></a>
</p>

Built with **Tauri** + **React** + **TypeScript** + **Rust** + **SQLite**.

OpenNX is designed to be a serious desktop tool for maintaining a legal homebrew setup: updates, backups, diagnostics, SD checks, payloads and configuration management from one place.

## v0.1.0 Alpha Scope

Included:

- **Desktop UI** — Native Tauri shell with a compact maintenance layout
- **Dashboard / Overview** — Current environment status and quick actions
- **Updates** — Atmosphere, Hekate and Homebrew Menu release checks
- **GitHub release checks** — Official release metadata from upstream projects
- **SD root selection** — Choose and analyze an SD card root
- **Backup preparation** — Backup surfaces before risky update workflows
- **Doctor** — Basic diagnostics for missing files and setup issues
- **Payloads / Configurations** — Early management surfaces

Not fully stable yet:

- Automatic install
- Rollback
- Payload injection
- Full visual configuration editor

## Features

- **Updates** — Check official releases for Atmosphere, Hekate and Homebrew Menu
- **Backups** — Prepare and manage local setup backups
- **Doctor** — Detect common SD structure and configuration issues
- **SD Manager** — Analyze SD health, missing files and duplicates
- **Payload Manager** — Add, organize and prepare RCM payloads
- **Configuration Manager** — Early surfaces for Atmosphere, Exosphere and Hekate configs
- **Settings** — Language, storage paths and safety preferences

## Non-goals

OpenNX does **not** include or support:

- NSP installation
- XCI support
- Game downloads
- Nintendo firmware distribution
- Nintendo keys
- Piracy shops or content mirrors
- Copyrighted content distribution

## Development

```bash
pnpm install
pnpm tauri dev
```

## Build

```bash
pnpm tauri build
```

## Validation

```bash
pnpm lint
pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
```

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE).
