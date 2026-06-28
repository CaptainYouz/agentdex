import { invoke } from '@tauri-apps/api/core'
import { nextTick, ref, watch, type Ref } from 'vue'

import { resolveWorktreeRoot } from '@/utils/resolveWorktreeRoot'
import { collectAncestorFolderPaths } from '@/utils/collectAncestorFolderPaths'
import type { CatalogItem } from '@/types/catalog.types'
import type { DirectoryEntry, WorktreeNode } from '@/types/worktree.types'

export function useWorktree(
  selectedItem: Ref<CatalogItem | null>,
  reloadToken: Ref<number>,
) {
  const homeDirectory = ref<string | null>(null)
  const worktreeRoot = ref<string | null>(null)
  const lastWorktreeRoot = ref<string | null>(null)
  const childrenByFolderPath = ref<Map<string, WorktreeNode[]>>(new Map())
  const expandedFolderPaths = ref<Set<string>>(new Set())
  const selectedFilePath = ref<string | null>(null)
  const isLoadingRoot = ref(false)
  const loadingFolderPaths = ref<Set<string>>(new Set())
  const errorMessage = ref('')
  const focusRequestToken = ref(0)

  async function ensureHomeDirectory() {
    if (homeDirectory.value) {
      return
    }

    homeDirectory.value = await invoke<string>('get_home_directory')
  }

  async function loadDirectoryChildren(folderPath: string): Promise<WorktreeNode[]> {
    const entries = await invoke<DirectoryEntry[]>('list_directory_children', {
      path: folderPath,
    })

    return entries.map((entry) => ({
      name: entry.name,
      path: entry.path,
      kind: entry.kind,
    }))
  }

  async function refreshFolderChildren(folderPath: string) {
    const nextLoadingPaths = new Set(loadingFolderPaths.value)
    nextLoadingPaths.add(folderPath)
    loadingFolderPaths.value = nextLoadingPaths

    try {
      const children = await loadDirectoryChildren(folderPath)
      const nextChildrenByPath = new Map(childrenByFolderPath.value)
      nextChildrenByPath.set(folderPath, children)
      childrenByFolderPath.value = nextChildrenByPath
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : String(error)
    } finally {
      const updatedLoadingPaths = new Set(loadingFolderPaths.value)
      updatedLoadingPaths.delete(folderPath)
      loadingFolderPaths.value = updatedLoadingPaths
    }
  }

  async function loadFolderChildren(folderPath: string) {
    if (childrenByFolderPath.value.has(folderPath)) {
      return
    }

    await refreshFolderChildren(folderPath)
  }

  function resetTreeState(nextRoot: string | null) {
    worktreeRoot.value = nextRoot
    childrenByFolderPath.value = new Map()
    expandedFolderPaths.value = new Set()
    loadingFolderPaths.value = new Set()
    errorMessage.value = ''
  }

  async function initializeWorktreeRoot(nextRoot: string) {
    resetTreeState(nextRoot)
    lastWorktreeRoot.value = nextRoot
    isLoadingRoot.value = true

    try {
      await loadFolderChildren(nextRoot)
      expandedFolderPaths.value = new Set([nextRoot])
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : String(error)
    } finally {
      isLoadingRoot.value = false
    }
  }

  async function expandFolder(folderPath: string) {
    const nextExpandedPaths = new Set(expandedFolderPaths.value)
    nextExpandedPaths.add(folderPath)
    expandedFolderPaths.value = nextExpandedPaths

    try {
      await loadFolderChildren(folderPath)
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : String(error)
    }
  }

  function collapseFolder(folderPath: string) {
    const nextExpandedPaths = new Set(expandedFolderPaths.value)
    nextExpandedPaths.delete(folderPath)
    expandedFolderPaths.value = nextExpandedPaths
  }

  async function toggleFolder(folderPath: string) {
    if (expandedFolderPaths.value.has(folderPath)) {
      collapseFolder(folderPath)
      return
    }

    await expandFolder(folderPath)
  }

  function selectFile(filePath: string) {
    selectedFilePath.value = filePath
  }

  async function expandAncestorsForSelectedFile(filePath: string) {
    const activeRoot = worktreeRoot.value
    if (!activeRoot) {
      return
    }

    const ancestorFolderPaths = collectAncestorFolderPaths(activeRoot, filePath)

    for (const folderPath of ancestorFolderPaths) {
      await expandFolder(folderPath)
    }
  }

  async function focusSelectedFile(filePath: string | null) {
    selectedFilePath.value = filePath

    if (!filePath || !worktreeRoot.value) {
      return
    }

    focusRequestToken.value += 1
    const currentFocusToken = focusRequestToken.value

    try {
      await expandAncestorsForSelectedFile(filePath)
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : String(error)
      return
    }

    if (currentFocusToken !== focusRequestToken.value) {
      return
    }

    await nextTick()
    const selectedRow = document.querySelector<HTMLElement>(
      `[data-worktree-path="${escapeSelectorValue(filePath)}"]`,
    )
    selectedRow?.scrollIntoView({ block: 'nearest' })
  }

  function isPathInTree(filePath: string): boolean {
    const activeRoot = worktreeRoot.value
    if (!activeRoot) {
      return false
    }

    return searchFolderForPath(activeRoot, filePath)
  }

  function searchFolderForPath(folderPath: string, filePath: string): boolean {
    const children = childrenByFolderPath.value.get(folderPath) ?? []

    for (const child of children) {
      if (child.path === filePath) {
        return true
      }

      if (child.kind === 'folder' && expandedFolderPaths.value.has(child.path)) {
        if (searchFolderForPath(child.path, filePath)) {
          return true
        }
      }
    }

    return false
  }

  async function reloadWorktree() {
    const activeRoot = worktreeRoot.value ?? lastWorktreeRoot.value
    if (!activeRoot) {
      selectedFilePath.value = null
      return
    }

    const foldersToRefresh = [...new Set([activeRoot, ...expandedFolderPaths.value])]
    errorMessage.value = ''

    for (const folderPath of foldersToRefresh) {
      await refreshFolderChildren(folderPath)
    }

    if (selectedFilePath.value && !isPathInTree(selectedFilePath.value)) {
      selectedFilePath.value = null
    }

    await focusSelectedFile(selectedItem.value?.path ?? null)
  }

  async function syncWorktreeWithSelection() {
    const currentSelectedItem = selectedItem.value

    try {
      await ensureHomeDirectory()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : String(error)
      return
    }

    const nextRoot = resolveWorktreeRoot(
      currentSelectedItem,
      homeDirectory.value,
    )
    const activeRoot = nextRoot ?? lastWorktreeRoot.value

    if (!activeRoot) {
      worktreeRoot.value = null
      selectedFilePath.value = null
      return
    }

    if (activeRoot !== worktreeRoot.value) {
      await initializeWorktreeRoot(activeRoot)
    }

    if (currentSelectedItem?.path) {
      await focusSelectedFile(currentSelectedItem.path)
    }
  }

  watch(selectedItem, () => {
    void syncWorktreeWithSelection()
  }, { immediate: true })

  watch(reloadToken, (nextToken, previousToken) => {
    if (nextToken === previousToken || nextToken === 0) {
      return
    }

    void reloadWorktree()
  })

  return {
    childrenByFolderPath,
    errorMessage,
    expandedFolderPaths,
    focusSelectedFile,
    homeDirectory,
    isLoadingRoot,
    lastWorktreeRoot,
    loadingFolderPaths,
    selectedFilePath,
    selectFile,
    toggleFolder,
    worktreeRoot,
  }
}

function escapeSelectorValue(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value)
  }

  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}
