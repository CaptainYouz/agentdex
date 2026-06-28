<template>
  <div class="worktree-node">
    <div
      class="tree-row"
      :class="{
        'is-file': node.kind === 'file',
        'is-selected': node.kind === 'file' && node.path === selectedFilePath,
      }"
      :data-worktree-path="node.path"
      :style="{ paddingLeft: `${depth * 0.75 + 0.25}rem` }"
    >
      <button
        v-if="node.kind === 'folder'"
        class="chevron-button"
        :aria-expanded="isExpanded"
        :title="isExpanded ? 'Collapse folder' : 'Expand folder'"
        type="button"
        @click.stop="emit('toggle-folder', node.path)"
      >
        <CodiconIcon
          :name="isExpanded ? 'chevron-down' : 'chevron-right'"
          :size="14"
        />
      </button>
      <span
        v-else
        class="chevron-spacer"
      />

      <button
        class="node-button"
        :title="node.path"
        type="button"
        @click="handleNodeClick"
      >
        <CodiconIcon
          :name="nodeIconName"
          :size="14"
        />
        <span class="node-label">{{ node.name }}</span>
      </button>

      <button
        class="reveal-button"
        :title="REVEAL_IN_FOLDER_LABEL"
        type="button"
        @click.stop="emit('reveal', node.path)"
      >
        <CodiconIcon
          name="link-external"
          :size="14"
        />
      </button>
    </div>

    <p
      v-if="node.kind === 'folder' && isExpanded && isLoadingChildren"
      class="loading-line"
      :style="{ paddingLeft: `${(depth + 1) * 0.75 + 0.25}rem` }"
    >
      {{ WORKTREE_LOADING_LABEL }}
    </p>

    <div
      v-else-if="node.kind === 'folder' && isExpanded"
      class="tree-children"
    >
      <WorktreeNode
        v-for="childNode in childNodes"
        :key="childNode.path"
        :children-by-folder-path="childrenByFolderPath"
        :depth="depth + 1"
        :expanded-folder-paths="expandedFolderPaths"
        :loading-folder-paths="loadingFolderPaths"
        :node="childNode"
        :selected-file-path="selectedFilePath"
        @reveal="emit('reveal', $event)"
        @select-file="emit('select-file', $event)"
        @toggle-folder="emit('toggle-folder', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import CodiconIcon from '@/components/CodiconIcon.vue'
import WorktreeNode from '@/components/WorktreeNode.vue'
import { WORKTREE_LOADING_LABEL } from '@/constants/worktree.constants'
import { REVEAL_IN_FOLDER_LABEL } from '@/constants/reveal.constants'
import type { CodiconName } from '@/types/codicon.types'
import type { WorktreeNode as WorktreeNodeType } from '@/types/worktree.types'

const props = defineProps<{
  node: WorktreeNodeType
  depth: number
  expandedFolderPaths: Set<string>
  childrenByFolderPath: Map<string, WorktreeNodeType[]>
  loadingFolderPaths: Set<string>
  selectedFilePath: string | null
}>()

const emit = defineEmits<{
  reveal: [path: string]
  'select-file': [path: string]
  'toggle-folder': [path: string]
}>()

const isExpanded = computed(() => props.expandedFolderPaths.has(props.node.path))

const childNodes = computed(() => props.childrenByFolderPath.get(props.node.path) ?? [])

const isLoadingChildren = computed(() => props.loadingFolderPaths.has(props.node.path))

const nodeIconName = computed<CodiconName>(() => {
  if (props.node.kind === 'file') {
    return 'file'
  }

  return isExpanded.value ? 'folder-opened' : 'folder'
})

function handleNodeClick() {
  if (props.node.kind === 'folder') {
    emit('toggle-folder', props.node.path)
    return
  }

  emit('select-file', props.node.path)
}
</script>

<style scoped>
.worktree-node {
  display: flex;
  flex-direction: column;
}

.tree-row {
  align-items: center;
  display: flex;
  gap: 0.1rem;
  min-width: 0;
  width: 100%;
}

.tree-row.is-selected {
  background: var(--accent-soft);
  border-radius: 4px;
}

.chevron-button,
.node-button,
.reveal-button {
  align-items: center;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  padding: 0;
}

.chevron-button {
  flex-shrink: 0;
  height: 1.35rem;
  justify-content: center;
  width: 1.1rem;
}

.chevron-button:hover,
.node-button:hover,
.reveal-button:hover,
.reveal-button:focus-visible {
  color: var(--accent);
}

.chevron-spacer {
  flex-shrink: 0;
  width: 1.1rem;
}

.node-button {
  flex: 1;
  gap: 0.3rem;
  min-width: 0;
  padding: 0.15rem 0.2rem 0.15rem 0;
  text-align: left;
}

.reveal-button {
  flex-shrink: 0;
  height: 1.35rem;
  justify-content: center;
  margin-left: auto;
  opacity: 0;
  padding: 0 0.2rem;
  width: 1.35rem;
}

.tree-row:hover .reveal-button,
.reveal-button:focus-visible {
  opacity: 1;
}

.node-label {
  color: var(--text);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.72rem;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-row.is-selected .node-label {
  color: var(--accent);
  font-weight: 600;
}

.loading-line {
  color: var(--text-muted);
  font-size: 0.68rem;
  margin: 0;
  padding-bottom: 0.1rem;
  padding-top: 0.1rem;
}

.tree-children {
  display: flex;
  flex-direction: column;
}
</style>
