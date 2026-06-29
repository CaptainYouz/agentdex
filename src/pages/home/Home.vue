<template>
  <div class="home-page">
    <div
      v-if="isLoading"
      class="scan-progress"
      role="status"
      aria-label="Scanning"
    />

    <header class="page-header">
      <div class="header-left">
        <h1>{{ APP_HEADER_TITLE }}</h1>
        <SummaryLine
          :is-loading="isLoading"
          :summary="catalog?.summary ?? null"
        />
      </div>
      <div class="header-right">
        <button
          v-if="displayedRoot"
          class="scan-root"
          type="button"
          :title="`Scanning from ${displayedRoot} — click to choose a different folder`"
          @click="switchScanRoot"
        >
          <CodiconIcon name="folder-opened" />
          <span class="scan-root__path">{{ displayedRoot }}</span>
        </button>
        <button
          class="refresh-button"
          :disabled="isLoading"
          type="button"
          @click="loadCatalog()"
        >
          {{ isLoading ? '…' : '↻' }}
        </button>
      </div>
    </header>

    <div class="toolbar">
      <SearchInput
        :model-value="searchQuery"
        @update:model-value="setSearchQuery"
      />
      <FilterTabs
        :active-filter="activeFilter"
        @update:active-filter="setFilter"
      />
    </div>

    <p
      v-if="errorMessage"
      class="error-banner"
    >
      {{ errorMessage }}
    </p>

    <div class="content-grid">
      <section
        ref="catalogPanelRef"
        class="catalog-panel"
      >
        <div class="catalog-header">
          <h2 class="scope-heading">
            Catalog
          </h2>
          <button
            class="catalog-collapse-button"
            :aria-label="areAllGroupsCollapsed ? 'Expand all groups' : 'Collapse all groups'"
            :title="areAllGroupsCollapsed ? 'Expand All' : 'Collapse All'"
            type="button"
            @click="toggleAllGroups"
          >
            <CodiconIcon :name="areAllGroupsCollapsed ? 'expand-all' : 'collapse-all'" />
          </button>
        </div>

        <CatalogSkeleton v-if="isLoading && !catalog" />

        <p
          v-else-if="visibleGroups.length === 0"
          class="status-line"
        >
          {{ isLoading ? 'Scanning…' : 'No matches' }}
        </p>

        <div
          v-else
          class="catalog-groups"
        >
          <GroupSection
            v-for="group in visibleGroups"
            :key="group.id"
            :collapse-all-token="collapseAllToken"
            :expand-all-token="expandAllToken"
            :group="group"
            :selected-item-id="selectedItem?.id ?? null"
            @expanded-change="handleGroupExpandedChange(group.id, $event)"
            @reveal="revealItem"
            @select="handleCatalogItemSelect"
          />
        </div>
      </section>

      <div
        ref="editorAreaRef"
        class="editor-area"
        :class="{ 'is-resizing': isResizingWorktree }"
        :style="worktreePanelWidthStyle"
      >
        <div class="editor-headers">
          <div
            v-if="isWorktreeVisible"
            class="worktree-header-cell"
          >
            <h2 class="scope-heading">
              {{ WORKTREE_HEADING }}
            </h2>
          </div>
          <h2 class="scope-heading editor-header-details">
            Details
          </h2>
        </div>

        <div class="editor-pane">
          <div
            class="editor-pane-worktree"
            :class="{ 'is-collapsed': !isWorktreeVisible }"
          >
            <button
              class="worktree-toggle-button"
              :aria-label="isWorktreeVisible ? 'Hide worktree panel' : 'Show worktree panel'"
              :title="isWorktreeVisible ? 'Hide worktree panel' : 'Show worktree panel'"
              type="button"
              @click="toggleWorktreeVisibility"
            >
              <CodiconIcon
                :name="isWorktreeVisible ? 'layout-sidebar-left-off' : 'layout-sidebar-left'"
              />
            </button>
            <template v-if="isWorktreeVisible">
              <WorktreePanel
                :reload-token="worktreeReloadToken"
                :scan-root="scanRoot"
                :selected-item="selectedItem"
                @reveal="revealPathInFileManager"
                @select-file="handleWorktreeFileSelect"
              />
              <div
                class="worktree-resize-handle"
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize worktree panel"
                :class="{ 'is-active': isResizingWorktree }"
                @mousedown="startWorktreeResize"
              />
            </template>
          </div>

          <section class="editor-pane-details">
            <DetailSkeleton v-if="isLoading && !catalog" />

            <WorktreeFileDetail
              v-else-if="isWorktreeDetailsActive && worktreeFileSelection"
              :delete-item="handleDeleteWorktreeFile"
              :file-stats="worktreeFileStats"
              :is-deleting="isDeletingWorktreeFile"
              :is-loading-preview="isLoadingWorktreePreview"
              :is-saving-preview="isSavingWorktreePreview"
              :is-unsupported="isUnsupportedWorktreeFile"
              :preview-content="worktreePreviewContent"
              :selection="worktreeFileSelection"
              @reload-preview="reloadWorktreePreview"
              @reveal="revealSelectedWorktreeFile"
              @save="saveWorktreePreviewContent"
            />

            <ItemDetail
              v-else
              :delete-item="deleteSelectedItem"
              :file-stats="fileStats"
              :is-deleting-item="isDeletingItem"
              :is-loading-preview="isLoadingPreview"
              :is-saving-preview="isSavingPreview"
              :item="selectedItem"
              :preview-content="previewContent"
              @reload-preview="loadPreviewForSelectedItem"
              @reveal="revealSelectedItem"
              @save="savePreviewContent"
            />
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'

import CatalogSkeleton from '@/components/CatalogSkeleton.vue'
import CodiconIcon from '@/components/CodiconIcon.vue'
import DetailSkeleton from '@/components/DetailSkeleton.vue'
import FilterTabs from '@/components/FilterTabs.vue'
import GroupSection from '@/components/GroupSection.vue'
import ItemDetail from '@/components/ItemDetail.vue'
import SearchInput from '@/components/SearchInput.vue'
import SummaryLine from '@/components/SummaryLine.vue'
import WorktreeFileDetail from '@/components/WorktreeFileDetail.vue'
import WorktreePanel from '@/components/WorktreePanel.vue'
import { useCatalog } from '@/composables/useCatalog'
import { revealItemFile } from '@/composables/useFileActions'
import { useResizablePanel } from '@/composables/useResizablePanel'
import { useWorktreeFilePreview } from '@/composables/useWorktreeFilePreview'
import { useWorktreePanel } from '@/composables/useWorktreePanel'
import { APP_HEADER_TITLE } from '@/constants/app.constants'
import type { CatalogItem } from '@/types/catalog.types'
import {
  WORKTREE_HEADING,
  WORKTREE_PANEL_DEFAULT_WIDTH,
  WORKTREE_PANEL_MAX_WIDTH,
  WORKTREE_PANEL_MIN_WIDTH,
  WORKTREE_PANEL_WIDTH_STORAGE_KEY,
} from '@/constants/worktree.constants'

const {
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
  scanRoot,
  searchQuery,
  selectItem,
  selectedItem,
  setFilter,
  setScanRoot,
  setSearchQuery,
  worktreeReloadToken,
} = useCatalog()

const {
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
  worktreeFileSelection,
  worktreeFileStats,
  worktreePreviewContent,
  worktreePreviewError,
} = useWorktreeFilePreview()

const { isWorktreeVisible, toggleWorktreeVisibility } = useWorktreePanel()

const visibleGroups = computed(() => getVisibleGroups())
const catalogPanelRef = useTemplateRef('catalogPanelRef')
const collapseAllToken = ref(0)
const expandAllToken = ref(0)
const groupExpandedStates = ref<Record<string, boolean>>({})

const areAllGroupsCollapsed = computed(() => {
  if (visibleGroups.value.length === 0) {
    return false
  }

  return visibleGroups.value.every((group) => groupExpandedStates.value[group.id] === false)
})

function handleGroupExpandedChange(groupId: string, isExpanded: boolean) {
  groupExpandedStates.value = {
    ...groupExpandedStates.value,
    [groupId]: isExpanded,
  }
}

function toggleAllGroups() {
  if (areAllGroupsCollapsed.value) {
    expandAllToken.value += 1
    return
  }

  collapseAllToken.value += 1
}

const editorAreaRef = useTemplateRef('editorAreaRef')

const {
  isResizing: isResizingWorktree,
  panelWidthStyle: worktreePanelWidthStyle,
  startResize: startWorktreeResize,
} = useResizablePanel(editorAreaRef, {
  defaultWidth: WORKTREE_PANEL_DEFAULT_WIDTH,
  minWidth: WORKTREE_PANEL_MIN_WIDTH,
  maxWidth: WORKTREE_PANEL_MAX_WIDTH,
  storageKey: WORKTREE_PANEL_WIDTH_STORAGE_KEY,
})

async function revealPathInFileManager(path: string) {
  try {
    await revealItemFile(path)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  }
}

async function handleCatalogItemSelect(item: CatalogItem) {
  clearWorktreeDetails()
  await selectItem(item)
}

watch(selectedItem, (newItem) => {
  if (newItem) {
    clearWorktreeDetails()
  }
})

async function scrollCatalogToSelectedItem() {
  await nextTick()
  const selectedRow = catalogPanelRef.value?.querySelector('.catalog-item-row.selected')
  selectedRow?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

async function handleWorktreeFileSelect(filePath: string) {
  const matchingCatalogItem = findItemByPath(filePath)

  if (matchingCatalogItem) {
    await selectItem(matchingCatalogItem)
    await scrollCatalogToSelectedItem()
    return
  }

  clearSelection()
  await selectWorktreeFile(filePath)

  if (worktreePreviewError.value) {
    errorMessage.value = worktreePreviewError.value
  }
}

async function revealSelectedWorktreeFile() {
  const filePath = worktreeFileSelection.value?.filePath
  if (!filePath) {
    return
  }

  await revealPathInFileManager(filePath)
}

async function handleDeleteWorktreeFile(): Promise<boolean> {
  const wasDeleted = await deleteWorktreeFile()
  if (!wasDeleted) {
    if (worktreePreviewError.value) {
      errorMessage.value = worktreePreviewError.value
    }
    return false
  }

  worktreeReloadToken.value += 1
  await loadCatalog()
  return true
}

const homeDirectoryPath = ref<string | null>(null)
const displayedRoot = computed(() => scanRoot.value ?? homeDirectoryPath.value)

async function loadHomeDirectory() {
  try {
    homeDirectoryPath.value = await invoke<string>('get_home_directory')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  }
}

async function switchScanRoot() {
  try {
    const selectedPath = await open({
      directory: true,
      multiple: false,
      title: 'Choose a folder to scan',
    })

    if (typeof selectedPath === 'string') {
      await setScanRoot(selectedPath)
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  }
}

onMounted(() => {
  void loadCatalog()
  void loadHomeDirectory()
})
</script>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  height: 100dvh;
  overflow: hidden;
  padding: 0.85rem;
}

/* Non-blocking scan indicator: a thin indeterminate bar pinned to the top.
   The rest of the UI stays visible and interactive while a scan runs. */
.scan-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  overflow: hidden;
  background: var(--accent-soft);
  z-index: 1000;
  pointer-events: none;
}

.scan-progress::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 40%;
  background: var(--accent);
  animation: scan-progress-slide 1.1s ease-in-out infinite;
}

@keyframes scan-progress-slide {
  0% {
    left: -40%;
  }
  100% {
    left: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .scan-progress::before {
    animation-duration: 2.4s;
  }
}

.page-header {
  align-items: center;
  display: flex;
  flex-shrink: 0;
  gap: 0.5rem;
  justify-content: space-between;
}

.header-left {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  min-width: 0;
}

h1 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
}

.header-right {
  align-items: center;
  display: flex;
  flex-shrink: 1;
  gap: 0.4rem;
  min-width: 0;
}

.scan-root {
  align-items: center;
  background: color-mix(in srgb, var(--panel) 80%, transparent);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-muted);
  cursor: pointer;
  display: inline-flex;
  font-size: 0.72rem;
  gap: 0.3rem;
  line-height: 1;
  max-width: 22rem;
  min-width: 0;
  padding: 0.25rem 0.5rem;
}

.scan-root:hover {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
  color: var(--text);
}

.scan-root__path {
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.refresh-button {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
  line-height: 1;
  padding: 0.4rem 0.6rem;
}

.refresh-button:disabled {
  opacity: 0.5;
}

.toolbar {
  align-items: center;
  display: flex;
  flex-shrink: 0;
  gap: 0.75rem;
}

.error-banner {
  background: #2a1518;
  border: 1px solid #5c2a32;
  border-radius: var(--radius);
  color: #ffb4bc;
  flex-shrink: 0;
  font-size: 0.75rem;
  margin: 0;
  padding: 0.35rem 0.5rem;
}

.content-grid {
  display: grid;
  flex: 1;
  gap: 0.75rem;
  grid-template-columns: minmax(0, 1fr) minmax(0, 3fr);
  min-height: 0;
}

.catalog-panel {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-height: 0;
  overflow-y: auto;
  padding-right: 0.15rem;
}

.catalog-header {
  align-items: center;
  background: var(--bg);
  display: flex;
  gap: 0.35rem;
  justify-content: space-between;
  padding-bottom: 0.35rem;
  position: sticky;
  top: 0;
  z-index: 1;
}

.catalog-collapse-button {
  background: color-mix(in srgb, var(--panel) 85%, transparent);
  border: none;
  border-radius: var(--radius);
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
  line-height: 0;
  padding: 0.2rem;
}

.catalog-collapse-button:hover {
  background: color-mix(in srgb, var(--border) 65%, transparent);
  color: var(--text);
}

.editor-area {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-height: 0;
}

.editor-area.is-resizing {
  cursor: col-resize;
  user-select: none;
}

.editor-headers {
  display: flex;
  flex-shrink: 0;
  gap: 0;
}

.worktree-header-cell {
  align-items: center;
  display: flex;
  flex-shrink: 0;
  min-width: 0;
  width: var(--worktree-width);
}

.editor-header-details {
  flex: 1;
  min-width: 0;
}

.worktree-toggle-button {
  background: color-mix(in srgb, var(--panel) 85%, transparent);
  border: none;
  border-radius: var(--radius);
  color: var(--text-muted);
  cursor: pointer;
  line-height: 0;
  padding: 0.2rem;
  position: absolute;
  right: 0.35rem;
  top: 0.35rem;
  z-index: 1;
}

.worktree-toggle-button:hover {
  background: color-mix(in srgb, var(--border) 65%, transparent);
  color: var(--text);
}

.editor-pane {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.editor-pane-worktree {
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-height: 0;
  overflow: hidden;
  padding: 0.45rem 0.35rem;
  position: relative;
  width: var(--worktree-width);
}

.editor-pane-worktree.is-collapsed {
  flex-shrink: 0;
  padding: 0;
  width: 1.75rem;
}

.editor-pane-worktree.is-collapsed .worktree-toggle-button {
  left: 0.3rem;
  right: auto;
}

.worktree-resize-handle {
  bottom: 0;
  cursor: col-resize;
  position: absolute;
  right: -3px;
  top: 0;
  touch-action: none;
  width: 6px;
  z-index: 2;
}

.worktree-resize-handle::after {
  background: transparent;
  content: '';
  inset: 0;
  position: absolute;
  transition: background 0.15s ease;
}

.worktree-resize-handle:hover::after,
.worktree-resize-handle.is-active::after {
  background: var(--accent-soft);
}

.editor-pane-worktree :deep(.worktree-panel) {
  flex: 1;
  min-height: 0;
}

.editor-pane-worktree :deep(.worktree-tree) {
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 0;
}

.editor-pane-details {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  padding: 0.65rem;
}

.editor-pane-details :deep(.item-detail),
.editor-pane-details :deep(.worktree-file-detail) {
  background: transparent;
  border: none;
  border-radius: 0;
  flex: 1;
  min-height: 0;
}

.catalog-groups {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.scope-heading {
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  margin: 0;
  text-transform: uppercase;
}

.status-line {
  color: var(--text-muted);
  font-size: 0.75rem;
  margin: 0;
}

@media (max-width: 1100px) {
  .home-page {
    height: auto;
    min-height: 100dvh;
    overflow: auto;
  }

  .toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .content-grid {
    grid-template-columns: 1fr;
  }

  .catalog-panel {
    max-height: 40dvh;
  }

  .worktree-header-cell {
    width: auto;
  }

  .editor-pane {
    flex-direction: column;
  }

  .editor-pane-worktree {
    border-bottom: 1px solid var(--border);
    border-right: none;
    max-height: 32dvh;
    width: auto;
  }

  .editor-pane-worktree.is-collapsed {
    max-height: none;
    width: 1.75rem;
  }

  .worktree-resize-handle {
    display: none;
  }
}
</style>
