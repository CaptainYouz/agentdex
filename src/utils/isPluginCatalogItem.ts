import { PLUGIN_CATEGORY_PREFIX } from '@/constants/plugin.constants'
import type { CatalogItem } from '@/types/catalog.types'

export function isPluginCatalogItem(item: CatalogItem): boolean {
  return item.category.startsWith(PLUGIN_CATEGORY_PREFIX)
}

export function extractPluginNameFromCategory(category: string): string | null {
  if (!category.startsWith(PLUGIN_CATEGORY_PREFIX)) {
    return null
  }

  const pluginName = category.slice(PLUGIN_CATEGORY_PREFIX.length).trim()
  return pluginName || null
}
