import { dirname, resolve } from '@tauri-apps/api/path'
import { openPath, openUrl } from '@tauri-apps/plugin-opener'

import { pathsMatch } from '@/utils/normalizeFilePath'

type PreviewHrefParts = {
  hashPart: string | null
  pathPart: string
}

type PreviewLinkKind = 'anchor' | 'external-url' | 'file'

function splitHrefHash(href: string): PreviewHrefParts {
  const hashIndex = href.indexOf('#')

  if (hashIndex === -1) {
    return { pathPart: href, hashPart: null }
  }

  if (hashIndex === 0) {
    return { pathPart: '', hashPart: href.slice(1) }
  }

  return {
    pathPart: href.slice(0, hashIndex),
    hashPart: href.slice(hashIndex + 1),
  }
}

function classifyPreviewLinkHref(href: string): PreviewLinkKind | null {
  const trimmedHref = href.trim()

  if (!trimmedHref || trimmedHref.startsWith('javascript:')) {
    return null
  }

  if (
    trimmedHref.startsWith('http://')
    || trimmedHref.startsWith('https://')
    || trimmedHref.startsWith('mailto:')
  ) {
    return 'external-url'
  }

  return 'file'
}

function findClosestAnchor(target: EventTarget | null): HTMLAnchorElement | null {
  if (!(target instanceof Element)) {
    return null
  }

  const anchor = target.closest('a')
  return anchor instanceof HTMLAnchorElement ? anchor : null
}

function isAbsoluteFilePath(filePath: string): boolean {
  return /^([a-zA-Z]:[\\/]|\/)/.test(filePath)
}

function decodeFileUrl(href: string): string {
  const withoutScheme = href.replace(/^file:\/\//, '')
  return decodeURIComponent(withoutScheme)
}

async function resolvePreviewFilePath(
  href: string,
  currentFilePath: string,
): Promise<string> {
  const normalizedHref = href.startsWith('file://') ? decodeFileUrl(href) : href

  if (isAbsoluteFilePath(normalizedHref)) {
    return normalizedHref
  }

  const parentDirectory = await dirname(currentFilePath)
  return resolve(parentDirectory, normalizedHref)
}

export function scrollToPreviewAnchor(
  container: HTMLElement,
  targetId: string,
): void {
  if (!targetId) {
    return
  }

  const escapedTargetId = CSS.escape(targetId)
  const target =
    container.querySelector(`#${escapedTargetId}`)
    ?? container.querySelector(`[id="${targetId}"]`)
    ?? container.querySelector(`a[name="${targetId}"]`)

  if (target instanceof HTMLElement) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

async function openPreviewFilePath(resolvedPath: string): Promise<void> {
  console.log('[handlePreviewLink] opening file path', { resolvedPath })
  await openPath(resolvedPath)
}

async function openPreviewExternalUrl(url: string): Promise<void> {
  console.log('[handlePreviewLink] opening external url', { url })
  await openUrl(url)
}

export async function handlePreviewLinkClick(
  event: MouseEvent,
  currentFilePath: string,
  container: HTMLElement,
): Promise<void> {
  const anchor = findClosestAnchor(event.target)
  if (!anchor) {
    return
  }

  const href = anchor.getAttribute('href')
  if (!href) {
    return
  }

  event.preventDefault()
  event.stopPropagation()

  const trimmedHref = href.trim()
  const { pathPart, hashPart } = splitHrefHash(trimmedHref)

  console.log('[handlePreviewLink] click intercepted', {
    currentFilePath,
    href: trimmedHref,
    hashPart,
    pathPart,
  })

  if (!pathPart) {
    if (hashPart) {
      scrollToPreviewAnchor(container, hashPart)
    }
    return
  }

  const linkKind = classifyPreviewLinkHref(pathPart)
  if (!linkKind) {
    return
  }

  if (linkKind === 'external-url') {
    const externalUrl = hashPart ? `${pathPart}#${hashPart}` : pathPart
    await openPreviewExternalUrl(externalUrl)
    return
  }

  const resolvedPath = await resolvePreviewFilePath(pathPart, currentFilePath)

  if (hashPart && pathsMatch(resolvedPath, currentFilePath)) {
    scrollToPreviewAnchor(container, hashPart)
    return
  }

  await openPreviewFilePath(resolvedPath)
}
