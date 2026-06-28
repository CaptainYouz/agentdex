<template>
  <aside class="item-detail">
    <div
      v-if="!item"
      class="empty-state"
    >
      Select an item to preview
    </div>

    <template v-else>
      <div class="detail-header">
        <div class="detail-line detail-line-title">
          <h2>{{ item.name }}</h2>
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
          <div class="badges">
            <PlatformBadge :platform="item.platform" />
            <span class="badge">{{ KIND_LABELS[item.kind] }}</span>
            <span class="badge muted">{{ SCOPE_LABELS[item.scope] }}</span>
          </div>

          <button
            class="path-button"
            type="button"
            @click="emit('reveal')"
          >
            {{ item.path }}
          </button>

          <p
            v-if="item.createdBy"
            class="created-by"
          >
            Created by {{ item.createdBy }}
          </p>

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

        <p
          v-if="item.description"
          class="description"
        >
          {{ item.description }}
        </p>
      </div>

      <FilePreview
        :content="previewContent"
        :delete-item="deleteItem"
        :file-path="item.path"
        :is-deleting="isDeletingItem"
        :is-loading="isLoadingPreview"
        :is-saving="isSavingPreview"
        @reload="emit('reload-preview')"
        @save="emit('save', $event)"
      />
    </template>
  </aside>
</template>

<script setup lang="ts">
import CodiconIcon from '@/components/CodiconIcon.vue'
import FilePreview from '@/components/FilePreview.vue'
import PlatformBadge from '@/components/PlatformBadge.vue'
import { KIND_LABELS, SCOPE_LABELS } from '@/constants/catalog.constants'
import { REVEAL_IN_FOLDER_LABEL } from '@/constants/reveal.constants'
import type { CatalogItem } from '@/types/catalog.types'
import type { ItemFileStats } from '@/types/file.types'
import { formatFileTimestamp } from '@/utils/formatFileTimestamp'

defineProps<{
  deleteItem: () => Promise<boolean>
  item: CatalogItem | null
  isDeletingItem: boolean
  isLoadingPreview: boolean
  isSavingPreview: boolean
  previewContent: string
  fileStats: ItemFileStats | null
}>()

const emit = defineEmits<{
  'reload-preview': []
  reveal: []
  save: [content: string]
}>()
</script>

<style scoped>
.item-detail {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding: 1.25rem;
}

.empty-state {
  color: var(--text-muted);
  font-size: 0.8rem;
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

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.badge {
  color: var(--text-muted);
  font-size: 0.62rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.badge.muted {
  opacity: 0.8;
}

.description {
  color: var(--text);
  flex-shrink: 0;
  font-size: 0.875rem;
  line-height: 1.55;
  margin: 0.35rem 0 0;
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

.created-by,
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
</style>
