# CLAUDE.md — Agentdex

Context for AI assistants working on this repo.

## Purpose

Desktop app (Tauri 2) to browse **skills**, **subagents**, **rules**, and **context** (CLAUDE.md) for Cursor, Claude, and Codex under the home directory (`~` / `%USERPROFILE%`). Users search/filter the catalog, preview and edit files, show paths in the system file manager, and explore the surrounding folder tree.

**Platforms:** macOS (primary), Windows, Linux (best-effort). Home directory uses `dirs::home_dir()`. Plugin skill paths use `Path::components()`, not string splitting.

## Commands

```bash
pnpm install
pnpm tauri dev      # dev app (Vite on :1420 + Rust backend)
pnpm tauri build    # production bundle
pnpm build          # frontend only (vue-tsc + vite)
pnpm lint           # eslint
```

Do **not** run tests or `tauri dev` unless the user asks.

## Architecture

```
src-tauri/src/          Rust backend (filesystem + scan)
  lib.rs                Tauri commands (IPC entry points)
  scanner.rs            Catalog scan logic
  parser.rs             YAML frontmatter for skills/agents
  directory.rs          Lazy directory listing (worktree panel)
  types.rs              Serde types (camelCase JSON to frontend)

src/                    Vue 3 + TypeScript UI
  pages/home/Home.vue   Main screen (catalog + detail + worktree)
  composables/          useCatalog, useWorktree, useFileActions, …
  components/           Presentational UI
  types/*.types.ts      Frontend types
  constants/*.constants.ts
  utils/                Pure helpers
```

**Data flow:** `Home.vue` → `useCatalog` → `invoke('scan_catalog')` → `scanner::build_catalog` → grouped `CatalogResponse`. File ops use `read_item_file`, `write_item_file`, `delete_item_file`, `reveal_item_path`, `get_item_file_stats`. Worktree uses `get_home_directory` + `list_directory_children`.

When changing catalog shape, update **both** `src-tauri/src/types.rs` and `src/types/catalog.types.ts` (serde `rename_all = "camelCase"` on Rust side).

## What gets scanned

**Global (under home directory)**

| Platform | Skills | Agents | Rules | Context |
|----------|--------|--------|-------|---------|
| Cursor | `.cursor/skills-cursor/`, `.cursor/skills/`, `.cursor/plugins/cache/**/skills/` | `.cursor/agents/*.md` | `.cursor/rules/*.mdc` | — |
| Claude | `.claude/plugins/cache/**/skills/` | `.claude/agents/*.md` | — | `$HOME/CLAUDE.md` or `$HOME/claude.md` |
| Codex | `.codex/skills/`, `.codex/plugins/cache/**/skills/` | `.codex/agents/*.md` | — | — |
| Shared | `.agents/skills/**/SKILL.md` | — | — | — |

Skills are folders containing `SKILL.md`. Frontmatter fields: `name`, `description`, optional author (`author` / `createdBy` / `created_by`).

**Context files** (`CLAUDE.md` / `claude.md`) are Claude Code project instructions — catalog kind **Context**, platform **Claude**. Optional YAML frontmatter (`name`, `description`); otherwise name comes from the parent folder and description from the first paragraph.

## Where to change what

| Task | Primary files |
|------|----------------|
| Add/change scan paths or grouping | `src-tauri/src/scanner.rs` |
| Frontmatter parsing | `src-tauri/src/parser.rs` |
| New Tauri command | `src-tauri/src/lib.rs` + composable in `src/composables/` |
| Catalog UI (list, filters, search) | `Home.vue`, `GroupSection.vue`, `CatalogItemRow.vue`, `useCatalog.ts` |
| File preview/edit/save | `FilePreview.vue`, `useCatalog.ts`, `useFileActions.ts` |
| Folder tree sidebar | `WorktreePanel.vue`, `useWorktree.ts`, `directory.rs` |
| Summary counts / filter tabs | `catalog.types.ts`, `catalog.constants.ts`, `FilterTabs.vue` |
| Reveal button label | `src/constants/reveal.constants.ts` |

## Conventions

- **Package manager:** pnpm only
- **Imports:** absolute `@/` paths (see `vite.config.ts`, `tsconfig.json`)
- **Types:** `type` (not `interface`) in `*.types.ts`; constants in `*.constants.ts`
- **Functions:** prefer `function` keyword over `const fn = () =>`
- **Vue:** template → script → style; page entry at `src/pages/<name>/<Name>.vue`; shared components in `src/components/`, page-local under `pages/.../components/`
- **Vue components:** keep under ~350 lines; split into dumb child components when logical
- **Rust:** meaningful `println!` logs on Tauri commands (existing pattern)
- **Linting:** ESLint only (no Prettier)
- **No `.agents-context`** in this repo — do not create or commit agent memory folders here

## Common assistant tasks

1. **Extend scanner** — add path constants and collectors in `scanner.rs`; mirror summary fields in `types.rs` / `catalog.types.ts` if counts change.
2. **New filter or platform** — extend `FilterMode` / `ItemPlatform` types and wire through `FilterTabs`, `useCatalog`, and scanner grouping.
3. **Preview behavior** — `FilePreview.vue` uses `marked` for rendered mode; raw mode edits disk via `write_item_file`.
4. **Worktree panel** — lazy-loads from item path upward via `resolveWorktreeRoot`; respects `worktreeReloadToken` after saves/deletes.

## Pitfalls

- Vite ignores `src-tauri/**` in watch mode — Rust changes need app restart or `tauri dev` rebuild.
- Deleting a catalog item removes the file on disk (`delete_item_file`) — keep confirm UI intact.
- Windows installers are **unsigned** for v1 — document SmartScreen workaround in README; Authenticode signing is deferred.

## Windows manual test checklist

Run on a real Windows machine or VM before the first public `v*` release:

- [ ] App launches; no home-dir error
- [ ] Global Cursor/Claude/Codex skills, agents, rules appear
- [ ] Plugin skills grouped under `Plugin · <name>`
- [ ] Global CLAUDE.md context file found
- [ ] Preview renders; edit saves; delete removes file (with confirm)
- [ ] Reveal opens Explorer at the correct file
- [ ] Worktree panel lazy-loads and reveals correctly
- [ ] File timestamps (created/modified) display
