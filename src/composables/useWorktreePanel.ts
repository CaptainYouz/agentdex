import { ref, watch } from 'vue'

import {
  WORKTREE_DEFAULT_VISIBLE,
  WORKTREE_VISIBILITY_STORAGE_KEY,
} from '@/constants/worktree.constants'

function readStoredWorktreeVisibility(): boolean {
  try {
    const storedValue = localStorage.getItem(WORKTREE_VISIBILITY_STORAGE_KEY)
    if (storedValue === null) {
      return WORKTREE_DEFAULT_VISIBLE
    }

    return storedValue === 'true'
  } catch {
    return WORKTREE_DEFAULT_VISIBLE
  }
}

function persistWorktreeVisibility(isVisible: boolean) {
  try {
    localStorage.setItem(WORKTREE_VISIBILITY_STORAGE_KEY, String(isVisible))
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
}

export function useWorktreePanel() {
  const isWorktreeVisible = ref(readStoredWorktreeVisibility())

  watch(isWorktreeVisible, (isVisible) => {
    persistWorktreeVisibility(isVisible)
  })

  function hideWorktree() {
    isWorktreeVisible.value = false
  }

  function showWorktree() {
    isWorktreeVisible.value = true
  }

  function toggleWorktreeVisibility() {
    isWorktreeVisible.value = !isWorktreeVisible.value
  }

  return {
    hideWorktree,
    isWorktreeVisible,
    showWorktree,
    toggleWorktreeVisibility,
  }
}
