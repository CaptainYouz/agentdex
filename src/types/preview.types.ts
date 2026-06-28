import type { CodiconName } from '@/types/codicon.types'

export type PreviewMode = 'rendered' | 'raw'

export type PreviewModeOption = {
  id: PreviewMode
  title: string
  icon: CodiconName
}
