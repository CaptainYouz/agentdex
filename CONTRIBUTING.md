# Contributing to Agentdex

Thanks for your interest in contributing. Agentdex is a local-first desktop app
(Tauri 2 + Rust backend, Vue 3 + TypeScript frontend). This guide covers how to
get set up and how to land a change.

## Privacy-first by design

Agentdex runs **fully on your machine**. It scans local files under your home
directory, makes **no network requests**, has **no account or backend**, and
**collects no data or telemetry**. Keep it that way: contributions must not add
network calls, analytics, crash reporters, or any phone-home behavior. PRs that
introduce outbound network access will be declined unless it's the existing
GitHub-release auto-updater path.

## Prerequisites

- **Node.js** 20+
- **pnpm** 9+ (the only supported package manager)
- **Rust** stable toolchain (`rustup` recommended)
- Platform deps for Tauri 2 — see the [Tauri prerequisites](https://tauri.app/start/prerequisites/)

## Setup

```bash
git clone git@github.com:CaptainYouz/agentdex.git
cd agentdex
pnpm install
pnpm tauri dev      # run the app (Vite on :1420 + Rust backend)
```

Other commands:

```bash
pnpm build          # frontend only (vue-tsc + vite)
pnpm lint           # eslint
pnpm tauri build    # production bundle
```

## Workflow

1. **Open an issue first** for anything non-trivial — describe the bug or
   feature so we can agree on scope before code.
2. **Branch** from `main`. Use a descriptive name: `feat/scan-codex-rules`,
   `fix/windows-home-path`.
   - Outside contributors: fork the repo and PR from your fork.
   - Collaborators: push a branch and open a PR.
3. **Make the change**, keeping it focused — one logical change per PR.
4. **Run checks locally** before pushing:
   ```bash
   pnpm lint
   pnpm build
   cd src-tauri && cargo check
   ```
5. **Open a PR** against `main`. CI runs lint + frontend build + `cargo check`
   on every PR. Green CI is required before merge.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>
```

- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`.
- Imperative mood, lowercase first letter, no trailing period.
- Example: `feat: scan Codex agent definitions`.

## Code conventions

**General**
- Package manager: **pnpm only**.
- Linting: **ESLint only** (no Prettier). Lint on save.
- Keep changes minimal and scoped — don't refactor unrelated code.

**TypeScript / Vue**
- Always TypeScript. Use `type`, not `interface`. Never `any` — use `unknown` + type guards.
- Types live in `*.types.ts`, constants in `*.constants.ts`.
- Prefer the `function` keyword over `const fn = () =>`.
- Absolute imports via `@/` (see `vite.config.ts`, `tsconfig.json`).
- Vue file order: `template` → `script` → `style`.
- Keep components under ~350 lines; split into small presentational children.
- Page entry at `src/pages/<name>/<Name>.vue`; shared components in
  `src/components/`, page-local under `pages/.../components/`.

**Rust (Tauri backend)**
- Meaningful `println!` logs on Tauri commands (follow the existing pattern).
- Use `Path::components()` for path handling, not string splitting.
- Resolve the home directory via `dirs::home_dir()` — never hardcode.

**Cross-cutting**
- When changing the catalog shape, update **both** `src-tauri/src/types.rs`
  and `src/types/catalog.types.ts` (serde uses `rename_all = "camelCase"`).

See [CLAUDE.md](./CLAUDE.md) for the full architecture map and where-to-change-what table.

## Platform support

macOS is the primary target; Windows and Linux are best-effort. If your change
touches filesystem paths, scanning, or reveal-in-file-manager behavior, note in
the PR which platforms you tested. The Windows manual test checklist lives in
[CLAUDE.md](./CLAUDE.md).

## Reporting bugs

Open a GitHub issue with: OS + version, Agentdex version, steps to reproduce,
expected vs actual behavior, and any relevant logs from the dev console.

## License

By contributing, you agree your contributions are licensed under the project's
[MIT License](./LICENSE).
