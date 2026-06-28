import { addIcon } from '@iconify/vue'
import codiconIcons from '@iconify-json/codicon/icons.json'

import type { CodiconName } from '@/types/codicon.types'

const CODICON_PREFIX = 'codicon'
const CODICON_SIZE = 16
const REGISTERED_CODICON_NAMES: Array<CodiconName> = [
  'chevron-down',
  'chevron-right',
  'collapse-all',
  'expand-all',
  'code',
  'file',
  'folder',
  'folder-opened',
  'layout-sidebar-left',
  'layout-sidebar-left-off',
  'link-external',
  'loading',
  'open-preview',
  'refresh',
  'save',
  'trash',
]

function registerCodicon(iconName: CodiconName) {
  const iconData = codiconIcons.icons[iconName as keyof typeof codiconIcons.icons]
  if (!iconData) {
    return
  }

  addIcon(`${CODICON_PREFIX}:${iconName}`, {
    body: iconData.body,
    width: CODICON_SIZE,
    height: CODICON_SIZE,
  })
}

export function registerPreviewCodicons() {
  for (const iconName of REGISTERED_CODICON_NAMES) {
    registerCodicon(iconName)
  }
}

export function codiconId(iconName: CodiconName): string {
  return `${CODICON_PREFIX}:${iconName}`
}
