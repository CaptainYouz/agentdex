export type ItemKind = 'skill' | 'agent' | 'rule' | 'context'

export type ItemScope = 'global' | 'project'

export type ItemPlatform = 'cursor' | 'claude' | 'codex' | 'shared'

export type CatalogItem = {
  id: string
  kind: ItemKind
  platform: ItemPlatform
  name: string
  description: string
  path: string
  scope: ItemScope
  category: string
  projectName: string | null
  createdBy: string | null
}

export type CatalogGroup = {
  id: string
  label: string
  scope: ItemScope
  kind: ItemKind
  platform: ItemPlatform
  items: CatalogItem[]
}

export type ItemsByKind = Record<ItemKind, CatalogItem[]>

export type MergedCatalogGroup = {
  id: string
  label: string
  scope: ItemScope
  platform: ItemPlatform
  itemsByKind: ItemsByKind
}

export type CatalogSummary = {
  totalSkills: number
  totalAgents: number
  totalRules: number
  totalContext: number
  cursorSkills: number
  cursorAgents: number
  cursorRules: number
  claudeSkills: number
  claudeAgents: number
  claudeContext: number
  codexSkills: number
  codexAgents: number
  codexRules: number
  sharedSkills: number
  globalSkills: number
  globalAgents: number
  globalRules: number
  globalContext: number
  projectSkills: number
  projectAgents: number
  projectRules: number
  projectContext: number
  projectCount: number
}

export type CatalogResponse = {
  summary: CatalogSummary
  groups: CatalogGroup[]
  scannedAt: string
}

export type FilterMode =
  | 'all'
  | 'skills'
  | 'agents'
  | 'rules'
  | 'context'
  | 'cursor'
  | 'claude'
  | 'codex'
  | 'shared'
  | 'global'
  | 'project'

export type FilterOption = {
  id: FilterMode
  label: string
}

export type FilterOptionGroup = {
  options: FilterOption[]
}
