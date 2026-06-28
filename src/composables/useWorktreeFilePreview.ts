import { computed, ref } from 'vue'

import {
  deleteItemFile,
  getItemFileStats,
  readItemFile,
  writeItemFile,
} from '@/composables/useFileActions'
import type { ItemFileStats } from '@/types/file.types'

const selectedWorktreeFilePath = ref<string | null>(null)
const worktreePreviewContent = ref('')
const worktreeFileStats = ref<ItemFileStats | null>(null)
const isLoadingWorktreePreview = ref(false)
const isSavingWorktreePreview = ref(false)
const isDeletingWorktreeFile = ref(false)
const isUnsupportedWorktreeFile = ref(false)
const isWorktreeDetailsActive = ref(false)
const worktreePreviewError = ref('')

export function useWorktreeFilePreview() {
  const worktreeFileSelection = computed(() => {
    const filePath = selectedWorktreeFilePath.value
    if (!filePath) {
      return null
    }

    return {
      filePath,
      fileName: getFileNameFromPath(filePath),
    }
  })

  function clearWorktreeDetails() {
    isWorktreeDetailsActive.value = false
    isUnsupportedWorktreeFile.value = false
    worktreePreviewContent.value = ''
    worktreeFileStats.value = null
    worktreePreviewError.value = ''
  }

  async function loadWorktreePreview(filePath: string) {
    console.log('[useWorktreeFilePreview] loading preview for:', filePath)
    isLoadingWorktreePreview.value = true
    worktreePreviewContent.value = ''
    worktreeFileStats.value = null
    worktreePreviewError.value = ''

    try {
      const [content, stats] = await Promise.all([
        readItemFile(filePath),
        getItemFileStats(filePath),
      ])
      worktreePreviewContent.value = content
      worktreeFileStats.value = stats
      console.log('[useWorktreeFilePreview] loaded preview:', filePath, `${content.length} bytes`)
    } catch (error) {
      worktreePreviewContent.value = ''
      worktreeFileStats.value = null
      worktreePreviewError.value = error instanceof Error ? error.message : String(error)
      console.error('[useWorktreeFilePreview] failed to load preview:', filePath, worktreePreviewError.value)
    } finally {
      isLoadingWorktreePreview.value = false
    }
  }

  async function selectWorktreeFile(filePath: string) {
    console.log('[useWorktreeFilePreview] selecting worktree file:', filePath)
    selectedWorktreeFilePath.value = filePath
    isWorktreeDetailsActive.value = true
    worktreePreviewError.value = ''

    if (!isMarkdownFile(filePath)) {
      isUnsupportedWorktreeFile.value = true
      worktreePreviewContent.value = ''
      worktreeFileStats.value = null
      console.log('[useWorktreeFilePreview] unsupported file type:', filePath)
      return
    }

    isUnsupportedWorktreeFile.value = false
    await loadWorktreePreview(filePath)
  }

  async function reloadWorktreePreview() {
    const filePath = selectedWorktreeFilePath.value
    if (!filePath || isUnsupportedWorktreeFile.value) {
      return
    }

    await loadWorktreePreview(filePath)
  }

  async function saveWorktreePreviewContent(content: string) {
    const filePath = selectedWorktreeFilePath.value
    if (!filePath) {
      return
    }

    isSavingWorktreePreview.value = true
    worktreePreviewError.value = ''

    try {
      await writeItemFile(filePath, content)
      await loadWorktreePreview(filePath)
    } catch (error) {
      worktreePreviewError.value = error instanceof Error ? error.message : String(error)
      console.error('[useWorktreeFilePreview] failed to save preview:', filePath, worktreePreviewError.value)
    } finally {
      isSavingWorktreePreview.value = false
    }
  }

  async function deleteWorktreeFile(): Promise<boolean> {
    const filePath = selectedWorktreeFilePath.value
    if (!filePath) {
      return false
    }

    isDeletingWorktreeFile.value = true
    worktreePreviewError.value = ''

    try {
      await deleteItemFile(filePath)
      selectedWorktreeFilePath.value = null
      clearWorktreeDetails()
      console.log('[useWorktreeFilePreview] deleted file:', filePath)
      return true
    } catch (error) {
      worktreePreviewError.value = error instanceof Error ? error.message : String(error)
      console.error('[useWorktreeFilePreview] failed to delete file:', filePath, worktreePreviewError.value)
      return false
    } finally {
      isDeletingWorktreeFile.value = false
    }
  }

  return {
    clearWorktreeDetails,
    deleteWorktreeFile,
    isDeletingWorktreeFile,
    isLoadingWorktreePreview,
    isSavingWorktreePreview,
    isUnsupportedWorktreeFile,
    isWorktreeDetailsActive,
    reloadWorktreePreview,
    saveWorktreePreviewContent,
    selectWorktreeFile,
    selectedWorktreeFilePath,
    worktreeFileSelection,
    worktreeFileStats,
    worktreePreviewContent,
    worktreePreviewError,
  }
}

function isMarkdownFile(filePath: string): boolean {
  return filePath.toLowerCase().endsWith('.md')
}

function getFileNameFromPath(filePath: string): string {
  const normalizedPath = filePath.replace(/\\/g, '/')
  const lastSlashIndex = normalizedPath.lastIndexOf('/')

  if (lastSlashIndex < 0) {
    return normalizedPath
  }

  return normalizedPath.slice(lastSlashIndex + 1) || normalizedPath
}
