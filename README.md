# Agentdex

**Your local command center for AI skills, agents, and rules** — a local desktop app to browse your Cursor, Claude, and Codex configs in one place.

Search and filter skills, agents, rules, and CLAUDE.md context files from your home directory. Preview markdown, edit in place, explore the worktree, show files in your system file manager. Offline — no account, no cloud.

![Agentdex — one searchable catalog of every skill, agent, rule, and context file](docs/screenshot.png)

**Supported platforms:** macOS (primary), Windows, Linux (best-effort)

For AI assistants working on this repo, see [CLAUDE.md](./CLAUDE.md).

## What it scans

**Global — Cursor**
- `~/.cursor/skills-cursor/` — Cursor built-in skills
- `~/.cursor/skills/` — your user skills
- `~/.cursor/plugins/cache/**/skills/` — Cursor plugin skills
- `~/.cursor/agents/` — Cursor subagents
- `~/.cursor/rules/` — Cursor user rules (`.mdc`)

**Global — Claude**
- `~/.claude/plugins/cache/**/skills/` — Claude plugin skills
- `~/.claude/agents/` — Claude subagents
- `~/CLAUDE.md` (or `~/claude.md`) — global context file

**Global — Codex**
- `~/.codex/skills/` — your user skills
- `~/.codex/plugins/cache/**/skills/` — Codex plugin skills
- `~/.codex/agents/` — Codex subagents

**Global — Shared**
- `~/.agents/skills/` — skills used across platforms

On Windows, `~` is `%USERPROFILE%` (e.g. `%USERPROFILE%\.cursor\...`).

## Install

### macOS / Linux (from source)

```bash
git clone git@github.com:CaptainYouz/agentdex.git
cd agentdex   # or your clone folder name
pnpm install
pnpm tauri dev     # development
pnpm tauri build   # production bundle
```

### Windows / macOS / Linux (pre-built)

Download the latest release for your OS from [GitHub Releases](https://github.com/CaptainYouz/agentdex/releases).

| OS | Artifacts |
|----|-----------|
| Windows | `.msi` and/or `.exe` (unsigned) |
| Linux | `.AppImage` and `.deb` |
| macOS | `.dmg` |

**Windows SmartScreen:** unsigned builds may show “Windows protected your PC.” Click **More info** → **Run anyway** to install.

**Linux:** make the AppImage executable (`chmod +x`) and run it, or install the `.deb` with your package manager.

## Path equivalents

| macOS / Linux | Windows |
|---------------|---------|
| `~` | `%USERPROFILE%` |
| `~/.cursor/...` | `%USERPROFILE%\.cursor\...` |

## Stack

- Tauri 2 + Rust (filesystem scan)
- Vue 3 + TypeScript (UI)
- pnpm

## Release

Tag a version to build all three platforms in CI:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The [release workflow](.github/workflows/release.yml) uploads per-OS installers to a draft GitHub Release.
