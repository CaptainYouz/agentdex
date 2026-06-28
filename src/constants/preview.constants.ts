import type { CodiconName } from '@/types/codicon.types'
import type { PreviewModeOption } from '@/types/preview.types'

export const PREVIEW_MODE_OPTIONS: Array<PreviewModeOption> = [
  { id: 'rendered', title: 'Open Preview', icon: 'open-preview' },
  { id: 'raw', title: 'Open Source', icon: 'code' },
]

export const PREVIEW_RELOAD_ICON: CodiconName = 'refresh'
export const PREVIEW_SAVE_ICON: CodiconName = 'save'
export const PREVIEW_DELETE_ICON: CodiconName = 'trash'
export const PREVIEW_DELETE_LOADING_ICON: CodiconName = 'loading'
