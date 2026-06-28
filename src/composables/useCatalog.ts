import { invoke } from '@tauri-apps/api/core'
import { ref } from 'vue'

import {
  deleteItemFile,
  getItemFileStats,
  readItemFile,
  revealItemFile,
  writeItemFile,
} from '@/composables/useFileActions'
import { KIND_SECTION_ORDER } from '@/constants/catalog.constants'
import type {
  CatalogItem,
  CatalogResponse,
  FilterMode,
  MergedCatalogGroup,
} from '@/types/catalog.types'
import type { ItemFileStats } from '@/types/file.types'
import { mergeCatalogGroups } from '@/utils/mergeCatalogGroups'
import { pathsMatch } from '@/utils/normalizeFilePath'

const catalog = ref<CatalogResponse | null>(null)
const isLoading = ref(false)
const errorMessage = ref('')
const searchQuery = ref('')
const activeFilter = ref<FilterMode>('all')
const selectedItem = ref<CatalogItem | null>(null)
const previewContent = ref('')
const isLoadingPreview = ref(false)
const isSavingPreview = ref(false)
const isDeletingItem = ref(false)
const fileStats = ref<ItemFileStats | null>(null)
const worktreeReloadToken = ref(0)

export function useCatalog() {
  async function loadCatalog() {
    isLoading.value = true
    errorMessage.value = ''

    try {
      catalog.value = await invoke<CatalogResponse>('scan_catalog')
      selectedItem.value = findFirstVisibleItem()
      await loadPreviewForSelectedItem()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : String(error)
      catalog.value = null
    } finally {
      isLoading.value = false
    }
  }

  async function revealItem(item: CatalogItem) {
    try {
      await revealItemFile(item.path)
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : String(error)
    }
  }

  async function revealSelectedItem() {
    if (!selectedItem.value) {
      return
    }

    await revealItem(selectedItem.value)
  }

  async function loadPreviewForSelectedItem() {
    if (!selectedItem.value) {
      previewContent.value = ''
      fileStats.value = null
      return
    }

    await loadPreview(selectedItem.value.path)
  }

  async function loadPreview(path: string) {
    isLoadingPreview.value = true
    previewContent.value = ''
    fileStats.value = null

    try {
      const [content, stats] = await Promise.all([
        readItemFile(path),
        getItemFileStats(path),
      ])
      previewContent.value = content
      fileStats.value = stats
    } catch (error) {
      previewContent.value = ''
      fileStats.value = null
      errorMessage.value = error instanceof Error ? error.message : String(error)
    } finally {
      isLoadingPreview.value = false
    }
  }

  async function selectItem(item: CatalogItem) {
    selectedItem.value = item
    await loadPreview(item.path)
  }

  function clearSelection() {
    selectedItem.value = null
    previewContent.value = ''
    fileStats.value = null
  }

  async function savePreviewContent(content: string) {
    if (!selectedItem.value) {
      return
    }

    const filePath = selectedItem.value.path
    isSavingPreview.value = true
    errorMessage.value = ''

    try {
      await writeItemFile(filePath, content)
      await loadPreview(filePath)
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : String(error)
    } finally {
      isSavingPreview.value = false
    }
  }

  async function deleteSelectedItem(): Promise<boolean> {
    if (!selectedItem.value) {
      return false
    }

    const filePath = selectedItem.value.path
    isDeletingItem.value = true
    errorMessage.value = ''

    try {
      await deleteItemFile(filePath)
      await loadCatalog()
      worktreeReloadToken.value += 1
      return true
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : String(error)
      return false
    } finally {
      isDeletingItem.value = false
    }
  }

  function setFilter(filter: FilterMode) {
    activeFilter.value = filter
    selectedItem.value = findFirstVisibleItem()
    void loadPreviewForSelectedItem()
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query
    selectedItem.value = findFirstVisibleItem()
    void loadPreviewForSelectedItem()
  }

  function findFirstVisibleItem(): CatalogItem | null {
    const groups = getVisibleGroups()

    for (const group of groups) {
      for (const kind of KIND_SECTION_ORDER) {
        const firstItem = group.itemsByKind[kind][0]
        if (firstItem) {
          return firstItem
        }
      }
    }

    return null
  }

  function findItemByPath(filePath: string): CatalogItem | null {
    if (!catalog.value) {
      return null
    }

    for (const group of catalog.value.groups) {
      for (const item of group.items) {
        if (pathsMatch(item.path, filePath)) {
          return item
        }
      }
    }

    return null
  }

  function getVisibleGroups(): MergedCatalogGroup[] {
    if (!catalog.value) {
      return []
    }

    const normalizedQuery = searchQuery.value.trim().toLowerCase()

    const filteredGroups = catalog.value.groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => matchesFilter(item, activeFilter.value, normalizedQuery)),
      }))
      .filter((group) => group.items.length > 0)

    return mergeCatalogGroups(filteredGroups)
  }

  return {
    activeFilter,
    catalog,
    clearSelection,
    deleteSelectedItem,
    errorMessage,
    fileStats,
    findItemByPath,
    getVisibleGroups,
    isDeletingItem,
    isLoading,
    isLoadingPreview,
    isSavingPreview,
    loadCatalog,
    loadPreviewForSelectedItem,
    previewContent,
    revealItem,
    revealSelectedItem,
    savePreviewContent,
    searchQuery,
    selectItem,
    selectedItem,
    setFilter,
    setSearchQuery,
    worktreeReloadToken,
  }
}

function matchesFilter(
  item: CatalogItem,
  filter: FilterMode,
  normalizedQuery: string,
): boolean {
  if (!matchesKindAndScope(item, filter)) {
    return false
  }

  if (!normalizedQuery) {
    return true
  }

  const haystack = [
    item.name,
    item.description,
    item.category,
    item.platform,
    item.projectName ?? '',
    item.path,
  ]
    .join(' ')
    .toLowerCase()

  return haystack.includes(normalizedQuery)
}

function matchesKindAndScope(item: CatalogItem, filter: FilterMode): boolean {
  if (filter === 'all') {
    return true
  }
  if (filter === 'skills') {
    return item.kind === 'skill'
  }
  if (filter === 'agents') {
    return item.kind === 'agent'
  }
  if (filter === 'rules') {
    return item.kind === 'rule'
  }
  if (filter === 'context') {
    return item.kind === 'context'
  }
  if (filter === 'cursor') {
    return item.platform === 'cursor'
  }
  if (filter === 'claude') {
    return item.platform === 'claude'
  }
  if (filter === 'codex') {
    return item.platform === 'codex'
  }
  if (filter === 'shared') {
    return item.platform === 'shared'
  }
  if (filter === 'global') {
    return item.scope === 'global'
  }
  return item.scope === 'project'
}
