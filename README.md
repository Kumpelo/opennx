# OpenNX

OpenNX is an open-source desktop toolkit for maintaining a Nintendo Switch homebrew setup safely.

Built with Tauri, React, TypeScript, Rust and SQLite.

## Alpha Scope

OpenNX is currently targeting a `v0.1.0 Alpha` release.

Included in this alpha:

- Desktop application shell
- Dashboard / Overview
- Updates page
- GitHub release checks
- SD root selection
- Backup preparation
- Basic Doctor checks
- Payload and configuration screens as early surfaces

Not fully stable yet:

- Automatic install
- Rollback
- Payload injection
- Full visual configuration editor

## Features

- Atmosphere, Hekate and Homebrew Menu release checks
- Backup preparation before update workflows
- SD root selection and basic SD analysis
- Doctor checks for common file and configuration issues
- Payload management surface
- Configuration management surface
- Safety options for backup, verification and rollback workflows

## Non-goals

OpenNX does not include or support:

- NSP installation
- XCI support
- Game downloads
- Nintendo firmware distribution
- Nintendo keys
- Piracy shops or content mirrors
- Copyrighted content distribution

## Development

Requirements:

- Node.js 22+
- pnpm
- Rust stable
- Tauri system dependencies for your operating system

Install dependencies:

```bash
pnpm install
```

Run the desktop app:

```bash
pnpm tauri dev
```

## Validation

Before opening a pull request, run:

```bash
pnpm lint
pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
```

## License

OpenNX is licensed under the GNU General Public License v3.0. See [LICENSE](LICENSE).
