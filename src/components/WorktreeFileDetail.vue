<template>
  <aside class="worktree-file-detail">
    <div class="detail-header">
      <div class="detail-line detail-line-title">
        <h2>{{ selection.fileName }}</h2>
        <button
          class="reveal-button"
          :title="REVEAL_IN_FOLDER_LABEL"
          type="button"
          @click="emit('reveal')"
        >
          <CodiconIcon
            name="link-external"
            :size="16"
          />
        </button>
      </div>

      <div class="detail-line detail-line-meta">
        <button
          class="path-button"
          type="button"
          @click="emit('reveal')"
        >
          {{ selection.filePath }}
        </button>

        <p
          v-if="fileStats"
          class="timestamps"
        >
          <span v-if="fileStats.createdAt !== null">
            Created {{ formatFileTimestamp(fileStats.createdAt) }}
          </span>
          <span v-if="fileStats.createdAt !== null"> · </span>
          <span>Modified {{ formatFileTimestamp(fileStats.modifiedAt) }}</span>
        </p>
      </div>
    </div>

    <p
      v-if="isUnsupported"
      class="unsupported-message"
    >
      {{ WORKTREE_UNSUPPORTED_FILE_LABEL }}
    </p>

    <FilePreview
      v-else
      :content="previewContent"
      :delete-item="deleteItem"
      :file-path="selection.filePath"
      :is-deleting="isDeleting"
      :is-loading="isLoadingPreview"
      :is-saving="isSavingPreview"
      @reload="emit('reload-preview')"
      @save="emit('save', $event)"
    />
  </aside>
</template>

<script setup lang="ts">
import CodiconIcon from '@/components/CodiconIcon.vue'
import FilePreview from '@/components/FilePreview.vue'
import { WORKTREE_UNSUPPORTED_FILE_LABEL } from '@/constants/worktree.constants'
import { REVEAL_IN_FOLDER_LABEL } from '@/constants/reveal.constants'
import type { ItemFileStats } from '@/types/file.types'
import type { WorktreeFileSelection } from '@/types/worktree.types'
import { formatFileTimestamp } from '@/utils/formatFileTimestamp'

defineProps<{
  deleteItem: () => Promise<boolean>
  fileStats: ItemFileStats | null
  isDeleting: boolean
  isLoadingPreview: boolean
  isSavingPreview: boolean
  isUnsupported: boolean
  previewContent: string
  selection: WorktreeFileSelection
}>()

const emit = defineEmits<{
  'reload-preview': []
  reveal: []
  save: [content: string]
}>()
</script>

<style scoped>
.worktree-file-detail {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.detail-header {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: 0.65rem;
}

.detail-line-title {
  align-items: flex-start;
  display: flex;
  gap: 0.5rem;
  justify-content: space-between;
}

.detail-line-title h2 {
  font-size: 1.3rem;
  font-weight: 600;
  line-height: 1.35;
  margin: 0;
  min-width: 0;
}

.detail-line-meta {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 0;
}

.path-button {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: block;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.65rem;
  line-height: 1.35;
  margin: 0;
  padding: 0;
  text-align: left;
  width: 100%;
  word-break: break-all;
}

.path-button:hover {
  color: var(--accent);
}

.timestamps {
  color: var(--text-muted);
  font-size: 0.65rem;
  line-height: 1.35;
  margin: 0;
  opacity: 0.9;
}

.reveal-button {
  align-items: center;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
  height: 1.65rem;
  justify-content: center;
  padding: 0;
  width: 1.85rem;
}

.reveal-button:hover {
  background: rgba(255, 255, 255, 0.04);
  color: var(--accent);
}

.unsupported-message {
  color: var(--text-muted);
  flex: 1;
  font-size: 0.8rem;
  margin: 0;
}
</style>
