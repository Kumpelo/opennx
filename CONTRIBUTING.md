# Contributing to OpenNX

## Prerequisites

- Node.js 22+
- pnpm
- Rust stable
- Tauri system dependencies (webkit2gtk, etc.)

## Setup

```bash
pnpm install
pnpm tauri dev
```

## Code style

- **React**: Functional components with hooks, no class components
- **Rust**: Follow `cargo clippy`, use `tauri::command` for IPC
- **CSS**: Tailwind 4 utility classes, no custom CSS files

## Branch strategy

- `main` — release branch, protected with PR rules
- Feature branches from `main`, PR back to `main`

## Before committing

```bash
pnpm lint
pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
```

## Pull request process

1. One feature/fix per PR
2. Keep PRs small and focused
3. Update docs if behaviour changes
4. Mark as draft until ready for review
