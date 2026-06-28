import {
  CURSOR_BUILT_IN_CATEGORY,
  CURSOR_BUILT_IN_GROUP_LABEL,
  CURSOR_BUILT_IN_MERGE_KEY,
  KIND_SECTION_ORDER,
  PLATFORM_GROUP_ORDER,
  PLATFORM_LABELS,
} from '@/constants/catalog.constants'
import { PLUGIN_GROUP_LABEL } from '@/constants/plugin.constants'
import type {
  CatalogGroup,
  CatalogItem,
  ItemsByKind,
  MergedCatalogGroup,
} from '@/types/catalog.types'
import {
  extractPluginNameFromCategory,
  isPluginCatalogItem,
} from '@/utils/isPluginCatalogItem'

const PLUGINS_MERGE_KEY = 'global|Plugins|'

export function mergeCatalogGroups(groups: CatalogGroup[]): MergedCatalogGroup[] {
  const mergedGroups = new Map<string, MergedCatalogGroup>()

  for (const group of groups) {
    appendCatalogGroup(mergedGroups, group)
  }

  sortPluginItems(mergedGroups.get(PLUGINS_MERGE_KEY))

  return [...mergedGroups.values()]
    .filter((group) => countMergedGroupItems(group) > 0)
    .sort(compareMergedGroups)
}

function appendCatalogGroup(
  mergedGroups: Map<string, MergedCatalogGroup>,
  group: CatalogGroup,
) {
  for (const item of group.items) {
    const mergeKey = resolveMergeKey(group, item)
    ensureMergedGroup(mergedGroups, mergeKey, group, item)
    const mergedGroup = mergedGroups.get(mergeKey)

    if (!mergedGroup) {
      continue
    }

    mergedGroup.itemsByKind[group.kind].push(item)
  }
}

function resolveMergeKey(group: CatalogGroup, item: CatalogItem): string {
  if (isPluginCatalogItem(item)) {
    return PLUGINS_MERGE_KEY
  }

  if (item.scope === 'project') {
    const projectName = item.projectName ?? group.label
    return `${item.scope}|${projectName}|`
  }

  if (
    item.scope === 'global'
    && item.platform === 'cursor'
    && item.category === CURSOR_BUILT_IN_CATEGORY
  ) {
    return CURSOR_BUILT_IN_MERGE_KEY
  }

  return `${item.scope}|${item.platform}|`
}

function resolveGroupLabel(mergeKey: string, item: CatalogItem, group: CatalogGroup): string {
  if (mergeKey === PLUGINS_MERGE_KEY) {
    return PLUGIN_GROUP_LABEL
  }

  if (mergeKey === CURSOR_BUILT_IN_MERGE_KEY) {
    return CURSOR_BUILT_IN_GROUP_LABEL
  }

  if (item.scope === 'project') {
    return item.projectName ?? group.label
  }

  return PLATFORM_LABELS[item.platform]
}

function ensureMergedGroup(
  mergedGroups: Map<string, MergedCatalogGroup>,
  mergeKey: string,
  group: CatalogGroup,
  item: CatalogItem,
) {
  if (mergedGroups.has(mergeKey)) {
    return
  }

  mergedGroups.set(mergeKey, {
    id: mergeKey,
    label: resolveGroupLabel(mergeKey, item, group),
    scope: item.scope,
    platform: item.platform,
    itemsByKind: createEmptyItemsByKind(),
  })
}

function createEmptyItemsByKind(): ItemsByKind {
  return {
    skill: [],
    agent: [],
    rule: [],
    context: [],
  }
}

function sortPluginItems(group: MergedCatalogGroup | undefined) {
  if (!group) {
    return
  }

  for (const kind of KIND_SECTION_ORDER) {
    group.itemsByKind[kind].sort(comparePluginCatalogItems)
  }
}

function comparePluginCatalogItems(leftItem: CatalogItem, rightItem: CatalogItem): number {
  const leftPluginName = extractPluginNameFromCategory(leftItem.category) ?? ''
  const rightPluginName = extractPluginNameFromCategory(rightItem.category) ?? ''
  const pluginNameComparison = leftPluginName.localeCompare(rightPluginName, undefined, {
    sensitivity: 'base',
  })

  if (pluginNameComparison !== 0) {
    return pluginNameComparison
  }

  return leftItem.name.localeCompare(rightItem.name, undefined, { sensitivity: 'base' })
}

function countMergedGroupItems(group: MergedCatalogGroup): number {
  return KIND_SECTION_ORDER.reduce(
    (total, kind) => total + group.itemsByKind[kind].length,
    0,
  )
}

function compareMergedGroups(leftGroup: MergedCatalogGroup, rightGroup: MergedCatalogGroup): number {
  const leftRank = getMergedGroupSortRank(leftGroup)
  const rightRank = getMergedGroupSortRank(rightGroup)

  if (leftRank !== rightRank) {
    return leftRank - rightRank
  }

  return leftGroup.label.localeCompare(rightGroup.label, undefined, { sensitivity: 'base' })
}

function getMergedGroupSortRank(group: MergedCatalogGroup): number {
  if (group.id === PLUGINS_MERGE_KEY) {
    return 1000
  }

  if (group.id === CURSOR_BUILT_IN_MERGE_KEY) {
    return 0
  }

  if (group.id === 'global|cursor|') {
    return 1
  }

  if (group.scope === 'project') {
    return 500
  }

  const platformIndex = PLATFORM_GROUP_ORDER.indexOf(group.platform)

  if (platformIndex === -1) {
    return PLATFORM_GROUP_ORDER.length + 2
  }

  return platformIndex + 2
}
