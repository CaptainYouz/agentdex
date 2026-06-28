import type { FilterOptionGroup, ItemKind, ItemPlatform } from '@/types/catalog.types'

export const FILTER_OPTION_GROUPS: FilterOptionGroup[] = [
  {
    options: [{ id: 'all', label: 'All' }],
  },
  {
    options: [
      { id: 'claude', label: 'Claude' },
      { id: 'cursor', label: 'Cursor' },
      { id: 'codex', label: 'Codex' },
      { id: 'shared', label: 'Shared' },
    ],
  },
  {
    options: [
      { id: 'agents', label: 'Agents' },
      { id: 'skills', label: 'Skills' },
      { id: 'rules', label: 'Rules' },
      { id: 'context', label: 'Context' },
    ],
  },
  {
    options: [
      { id: 'global', label: 'Global' },
      { id: 'project', label: 'Projects' },
    ],
  },
]

export const KIND_LABELS: Record<string, string> = {
  skill: 'Skill',
  agent: 'Agent',
  rule: 'Rule',
  context: 'Context',
}

export const KIND_BADGE_LABELS: Record<ItemKind, string> = {
  skill: 'Skills',
  agent: 'Agents',
  rule: 'Rules',
  context: 'Context',
}

export const KIND_SECTION_ORDER: ItemKind[] = ['skill', 'agent', 'rule', 'context']

export const SCOPE_LABELS: Record<string, string> = {
  global: 'Global',
  project: 'Project',
}

export const SCOPE_SECTION_LABELS: Record<string, string> = {
  global: 'Global',
  project: 'Projects',
}

export const PLATFORM_LABELS: Record<ItemPlatform, string> = {
  cursor: 'Cursor',
  claude: 'Claude',
  codex: 'Codex',
  shared: 'Shared',
}

export const PLATFORM_GROUP_ORDER: ItemPlatform[] = ['cursor', 'claude', 'codex', 'shared']

export const CURSOR_BUILT_IN_CATEGORY = 'Cursor Built-in'

export const CURSOR_BUILT_IN_GROUP_LABEL = 'Cursor Built-in'

export const CURSOR_BUILT_IN_MERGE_KEY = 'global|cursor|built-in'

export const PLATFORM_BADGE_CLASS: Record<ItemPlatform, string> = {
  cursor: 'platform-cursor',
  claude: 'platform-claude',
  codex: 'platform-codex',
  shared: 'platform-shared',
}
