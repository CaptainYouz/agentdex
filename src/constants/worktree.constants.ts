export const WORKTREE_HEADING = 'Worktree'

export const WORKTREE_DEFAULT_VISIBLE = true

export const WORKTREE_VISIBILITY_STORAGE_KEY = 'agentdex:worktree-visible'

export const WORKTREE_PANEL_DEFAULT_WIDTH = 300

export const WORKTREE_PANEL_MIN_WIDTH = 80

export const WORKTREE_PANEL_MAX_WIDTH = 400

export const WORKTREE_PANEL_WIDTH_STORAGE_KEY = 'agentdex:worktree-panel-width'

export const WORKTREE_EMPTY_LABEL = 'Select a catalog item to browse its worktree'

export const WORKTREE_LOADING_LABEL = 'Loading…'

export const WORKTREE_UNSUPPORTED_FILE_LABEL = 'This content type is not supported'

export const WORKTREE_ERROR_LABEL = 'Could not load directory'

// Project roots are the parent of these config directories (see scanner.rs).
export const PROJECT_CONFIG_DIRECTORY_NAMES = ['.cursor', '.claude', '.codex'] as const

export const CONTEXT_FILE_NAMES = ['CLAUDE.md', 'claude.md'] as const

// Global catalog items live under the home directory (~/.cursor, ~/.claude, etc.).
export const GLOBAL_WORKTREE_USES_HOME_DIRECTORY = true
