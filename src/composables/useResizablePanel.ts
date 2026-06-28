import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'

import type { ResizablePanelOptions } from '@/types/resizablePanel.types'

function clampWidth(width: number, minWidth: number, maxWidth: number): number {
  return Math.min(maxWidth, Math.max(minWidth, width))
}

function readStoredWidth(storageKey: string, defaultWidth: number): number {
  try {
    const stored = localStorage.getItem(storageKey)
    if (!stored) {
      return defaultWidth
    }

    const parsed = Number.parseFloat(stored)
    return Number.isFinite(parsed) ? parsed : defaultWidth
  } catch {
    return defaultWidth
  }
}

function writeStoredWidth(storageKey: string, width: number) {
  try {
    localStorage.setItem(storageKey, String(width))
  } catch {
    // Ignore storage errors (private mode, quota, etc.).
  }
}

export function useResizablePanel(
  containerRef: Ref<{ clientWidth: number } | null | undefined>,
  options: ResizablePanelOptions,
) {
  const panelWidth = ref(
    options.storageKey
      ? readStoredWidth(options.storageKey, options.defaultWidth)
      : options.defaultWidth,
  )
  const isResizing = ref(false)

  let resizeStartX = 0
  let resizeStartWidth = 0

  function resolveMaxWidth(): number {
    const containerWidth = containerRef.value?.clientWidth ?? 0
    const halfContainerWidth = containerWidth > 0 ? containerWidth * 0.5 : options.maxWidth
    return Math.min(options.maxWidth, halfContainerWidth)
  }

  function clampPanelWidth(width: number): number {
    return clampWidth(width, options.minWidth, resolveMaxWidth())
  }

  function onMouseMove(event: MouseEvent) {
    const delta = event.clientX - resizeStartX
    panelWidth.value = clampPanelWidth(resizeStartWidth + delta)
  }

  function stopResize() {
    isResizing.value = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', stopResize)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''

    if (options.storageKey) {
      writeStoredWidth(options.storageKey, panelWidth.value)
    }
  }

  function startResize(event: MouseEvent) {
    event.preventDefault()
    isResizing.value = true
    resizeStartX = event.clientX
    resizeStartWidth = panelWidth.value
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', stopResize)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  function onWindowResize() {
    panelWidth.value = clampPanelWidth(panelWidth.value)
  }

  const panelWidthStyle = computed(() => ({
    '--worktree-width': `${clampPanelWidth(panelWidth.value)}px`,
  }))

  onMounted(() => {
    panelWidth.value = clampPanelWidth(panelWidth.value)
    window.addEventListener('resize', onWindowResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', onWindowResize)
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', stopResize)
  })

  return {
    isResizing,
    panelWidth,
    panelWidthStyle,
    startResize,
  }
}
