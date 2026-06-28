<template>
  <section class="file-preview">
    <header
      v-if="content"
      class="preview-header"
    >
      <div class="preview-header-actions">
        <PreviewModeSwitch
          :model-value="previewMode"
          @update:model-value="handlePreviewModeChange"
        />

        <button
          class="toolbar-button"
          :disabled="isLoading"
          title="Reload"
          type="button"
          @click="handleReload"
        >
          <CodiconIcon
            :name="PREVIEW_RELOAD_ICON"
            :size="16"
          />
        </button>

        <button
          v-if="isDirty"
          class="toolbar-button save-button"
          :disabled="isSaving || isLoading"
          title="Save"
          type="button"
          @click="handleSave"
        >
          <CodiconIcon
            :name="PREVIEW_SAVE_ICON"
            :size="16"
          />
        </button>

        <button
          class="toolbar-button delete-button"
          :class="{ 'is-deleting': isDeleting }"
          :disabled="isDeleting || isLoading"
          title="Delete file"
          type="button"
          @click="showDeleteModal = true"
        >
          <CodiconIcon
            :class="{ 'delete-spinner': isDeleting }"
            :name="isDeleting ? PREVIEW_DELETE_LOADING_ICON : PREVIEW_DELETE_ICON"
            :size="16"
          />
        </button>
      </div>
    </header>

    <p
      v-if="isLoading"
      class="preview-status"
    >
      Loading...
    </p>

    <div
      v-else-if="content && previewMode === 'rendered'"
      ref="previewRenderedRef"
      class="preview-content markdown-content preview-rendered"
      v-html="renderedHtml"
      @click="handlePreviewLink"
    />

    <textarea
      v-else-if="content"
      v-model="editedContent"
      class="preview-content raw-editor"
      spellcheck="false"
    />

    <ConfirmDeleteModal
      :file-path="filePath"
      :is-deleting="isDeleting"
      :is-open="showDeleteModal"
      @cancel="showDeleteModal = false"
      @confirm="handleDeleteConfirm"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import CodiconIcon from '@/components/CodiconIcon.vue'
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal.vue'
import PreviewModeSwitch from '@/components/PreviewModeSwitch.vue'
import {
  PREVIEW_DELETE_ICON,
  PREVIEW_DELETE_LOADING_ICON,
  PREVIEW_RELOAD_ICON,
  PREVIEW_SAVE_ICON,
} from '@/constants/preview.constants'
import type { PreviewMode } from '@/types/preview.types'
import { handlePreviewLinkClick } from '@/utils/handlePreviewLink'
import { renderMarkdown } from '@/utils/markdownPreview'

const props = defineProps<{
  content: string
  deleteItem: () => Promise<boolean>
  filePath: string
  isDeleting: boolean
  isLoading: boolean
  isSaving: boolean
}>()

const emit = defineEmits<{
  reload: []
  save: [content: string]
}>()

const previewMode = ref<PreviewMode>('rendered')
const editedContent = ref('')
const originalContent = ref('')
const showDeleteModal = ref(false)
const previewRenderedRef = ref<HTMLElement | null>(null)

const isDirty = computed(() => editedContent.value !== originalContent.value)

const renderedHtml = computed(() => {
  if (!props.content) {
    return ''
  }

  return renderMarkdown(props.content)
})

watch(
  () => props.content,
  (newContent) => {
    editedContent.value = newContent
    originalContent.value = newContent
  },
  { immediate: true },
)

function handlePreviewModeChange(nextMode: PreviewMode) {
  if (previewMode.value === nextMode) {
    return
  }

  if (isDirty.value && previewMode.value === 'raw') {
    const shouldDiscard = globalThis.confirm(
      'You have unsaved changes. Discard them and switch view?',
    )
    if (!shouldDiscard) {
      return
    }
    editedContent.value = originalContent.value
  }

  previewMode.value = nextMode
}

function handleReload() {
  if (isDirty.value) {
    const shouldDiscard = globalThis.confirm(
      'You have unsaved changes. Discard them and reload?',
    )
    if (!shouldDiscard) {
      return
    }
  }

  emit('reload')
}

function handleSave() {
  if (!isDirty.value || props.isSaving) {
    return
  }

  emit('save', editedContent.value)
}

async function handleDeleteConfirm() {
  if (props.isDeleting) {
    return
  }

  const wasDeleted = await props.deleteItem()
  if (wasDeleted) {
    showDeleteModal.value = false
  }
}

async function handlePreviewLink(event: MouseEvent) {
  const previewContainer = previewRenderedRef.value
  if (!previewContainer) {
    return
  }

  try {
    await handlePreviewLinkClick(event, props.filePath, previewContainer)
  } catch (error) {
    console.error('[FilePreview] failed to handle preview link click', {
      error,
      filePath: props.filePath,
    })
  }
}
</script>

<style scoped>
.file-preview {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.35rem;
  min-height: 0;
}

.preview-header {
  display: flex;
  flex-shrink: 0;
}

.preview-header-actions {
  align-items: center;
  display: flex;
  flex: 1;
  gap: 0.35rem;
  justify-content: flex-end;
}

.toolbar-button {
  align-items: center;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  height: 1.65rem;
  justify-content: center;
  padding: 0;
  width: 1.85rem;
}

.toolbar-button:disabled {
  opacity: 0.45;
}

.toolbar-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
}

.save-button:hover:not(:disabled) {
  color: var(--accent);
}

.delete-button:hover:not(:disabled) {
  color: #ffb4bc;
}

.delete-button.is-deleting {
  color: #ffb4bc;
}

.delete-spinner {
  animation: delete-spinner-spin 0.8s linear infinite;
}

@keyframes delete-spinner-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.preview-status {
  color: var(--text-muted);
  font-size: 0.75rem;
  margin: 0;
}

.preview-content {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  flex: 1;
  margin: 0;
  min-height: 0;
  overflow: auto;
  padding: 0.75rem;
}

.raw-editor {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.78rem;
  line-height: 1.5;
  resize: none;
  white-space: pre-wrap;
  width: 100%;
  word-break: break-word;
}

.raw-editor:focus {
  border-color: var(--accent);
  outline: none;
}

.markdown-content {
  font-size: 0.85rem;
  line-height: 1.55;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4) {
  color: var(--text);
  line-height: 1.3;
  margin: 1rem 0 0.5rem;
}

.markdown-content :deep(h1) {
  font-size: 1.2rem;
}

.markdown-content :deep(h2) {
  font-size: 1.05rem;
}

.markdown-content :deep(h3) {
  font-size: 0.95rem;
}

.markdown-content :deep(p),
.markdown-content :deep(ul),
.markdown-content :deep(ol),
.markdown-content :deep(blockquote) {
  margin: 0 0 0.75rem;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  padding-left: 1.25rem;
}

.markdown-content :deep(li + li) {
  margin-top: 0.25rem;
}

.markdown-content :deep(code) {
  background: var(--panel-muted);
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.82em;
  padding: 0.1rem 0.3rem;
}

.markdown-content :deep(pre) {
  background: var(--panel-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin: 0 0 0.75rem;
  overflow: auto;
  padding: 0.65rem;
}

.markdown-content :deep(pre code) {
  background: transparent;
  padding: 0;
}

.markdown-content :deep(blockquote) {
  border-left: 3px solid var(--border);
  color: var(--text-muted);
  padding-left: 0.75rem;
}

.markdown-content :deep(a) {
  color: var(--accent);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.markdown-content :deep(hr) {
  border: none;
  border-top: 1px solid var(--border);
  margin: 1rem 0;
}

.markdown-content :deep(table) {
  border-collapse: collapse;
  margin: 0 0 0.75rem;
  width: 100%;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid var(--border);
  padding: 0.35rem 0.5rem;
  text-align: left;
}

.markdown-content :deep(th) {
  background: var(--panel-muted);
}
</style>
