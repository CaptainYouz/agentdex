<template>
  <section class="worktree-panel">
    <div class="worktree-tree">
      <p
        v-if="!activeRoot"
        class="empty-state"
      >
        {{ WORKTREE_EMPTY_LABEL }}
      </p>

      <p
        v-else-if="errorMessage"
        class="error-state"
      >
        {{ errorMessage }}
      </p>

      <div
        v-else
        class="tree-scroll"
      >
        <p
          v-if="isLoadingRoot"
          class="loading-state"
        >
          {{ WORKTREE_LOADING_LABEL }}
        </p>

        <WorktreeNode
          v-else
          :children-by-folder-path="childrenByFolderPath"
          :depth="0"
          :expanded-folder-paths="expandedFolderPaths"
          :loading-folder-paths="loadingFolderPaths"
          :node="rootNode"
          :selected-file-path="selectedFilePath"
          @reveal="emit('reveal', $event)"
          @select-file="handleSelectFile"
          @toggle-folder="toggleFolder"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'

import WorktreeNode from '@/components/WorktreeNode.vue'
import {
  WORKTREE_EMPTY_LABEL,
  WORKTREE_LOADING_LABEL,
} from '@/constants/worktree.constants'
import { useWorktree } from '@/composables/useWorktree'
import type { CatalogItem } from '@/types/catalog.types'
import type { WorktreeNode as WorktreeNodeType } from '@/types/worktree.types'

const props = defineProps<{
  selectedItem: CatalogItem | null
  reloadToken: number
}>()

const emit = defineEmits<{
  reveal: [path: string]
  'select-file': [path: string]
}>()

const selectedItemRef = toRef(props, 'selectedItem')
const reloadTokenRef = toRef(props, 'reloadToken')

const {
  childrenByFolderPath,
  errorMessage,
  expandedFolderPaths,
  homeDirectory,
  isLoadingRoot,
  lastWorktreeRoot,
  loadingFolderPaths,
  selectFile,
  selectedFilePath,
  toggleFolder,
  worktreeRoot,
} = useWorktree(selectedItemRef, reloadTokenRef)

const activeRoot = computed(() => worktreeRoot.value ?? lastWorktreeRoot.value)

const rootNode = computed<WorktreeNodeType>(() => ({
  name: getRootDisplayName(activeRoot.value ?? '', homeDirectory.value),
  path: activeRoot.value ?? '',
  kind: 'folder',
}))

function getRootDisplayName(rootPath: string, homePath: string | null): string {
  if (homePath && rootPath === homePath) {
    return '~'
  }

  const normalizedPath = rootPath.replace(/\\/g, '/')
  const lastSlashIndex = normalizedPath.lastIndexOf('/')

  if (lastSlashIndex < 0) {
    return normalizedPath
  }

  const baseName = normalizedPath.slice(lastSlashIndex + 1)
  return baseName || normalizedPath
}

function handleSelectFile(filePath: string) {
  selectFile(filePath)
  emit('select-file', filePath)
}
</script>

<style scoped>
.worktree-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.worktree-tree {
  background: var(--panel-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 0.45rem 0.35rem;
}

.empty-state,
.error-state,
.loading-state {
  font-size: 0.72rem;
  margin: 0;
  padding: 0.35rem 0.45rem;
}

.empty-state,
.loading-state {
  color: var(--text-muted);
}

.error-state {
  color: #ffb4bc;
}

.tree-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 0.1rem;
}
</style>
