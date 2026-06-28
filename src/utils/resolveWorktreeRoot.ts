import {
  CONTEXT_FILE_NAMES,
  PROJECT_CONFIG_DIRECTORY_NAMES,
} from '@/constants/worktree.constants'
import type { CatalogItem } from '@/types/catalog.types'

export function resolveWorktreeRoot(
  item: CatalogItem | null,
  homeDirectory: string | null,
): string | null {
  if (!item || !homeDirectory) {
    return null
  }

  if (item.scope === 'project') {
    if (item.kind === 'context') {
      return getParentDirectory(item.path)
    }

    const projectsRoot = joinPath(homeDirectory, 'Development')

    return (
      resolveProjectRootFromConfigDirectory(item.path)
      ?? resolveProjectRootFromProjectsRoot(item.path, projectsRoot)
      ?? resolveProjectRootFromContextFilePath(item.path)
    )
  }

  return homeDirectory
}

function resolveProjectRootFromConfigDirectory(itemPath: string): string | null {
  let currentDirectory = getParentDirectory(itemPath)

  while (currentDirectory && currentDirectory !== '/') {
    const directoryName = getBaseName(currentDirectory)

    if (isProjectConfigDirectory(directoryName)) {
      return getParentDirectory(currentDirectory)
    }

    currentDirectory = getParentDirectory(currentDirectory)
  }

  return null
}

function resolveProjectRootFromProjectsRoot(
  itemPath: string,
  projectsRoot: string,
): string | null {
  const normalizedProjectsRoot = normalizePath(projectsRoot)
  const normalizedItemPath = normalizePath(itemPath)
  const projectsRootPrefix = `${normalizedProjectsRoot}/`

  if (
    normalizedItemPath !== normalizedProjectsRoot
    && !normalizedItemPath.startsWith(projectsRootPrefix)
  ) {
    return null
  }

  const relativePath = normalizedItemPath.slice(normalizedProjectsRoot.length).replace(/^\//, '')
  const firstSegment = relativePath.split('/')[0]

  if (!firstSegment) {
    return null
  }

  return joinPath(normalizedProjectsRoot, firstSegment)
}

function resolveProjectRootFromContextFilePath(itemPath: string): string | null {
  if (!isContextFilePath(itemPath)) {
    return null
  }

  return getParentDirectory(itemPath)
}

function isContextFilePath(filePath: string): boolean {
  const fileName = getBaseName(filePath)
  return CONTEXT_FILE_NAMES.some(
    (contextFileName) => fileName.toLowerCase() === contextFileName.toLowerCase(),
  )
}

function isProjectConfigDirectory(directoryName: string): boolean {
  return PROJECT_CONFIG_DIRECTORY_NAMES.includes(
    directoryName as (typeof PROJECT_CONFIG_DIRECTORY_NAMES)[number],
  )
}

function getParentDirectory(absolutePath: string): string {
  const normalizedPath = absolutePath.replace(/\\/g, '/')
  const lastSlashIndex = normalizedPath.lastIndexOf('/')

  if (lastSlashIndex <= 0) {
    return '/'
  }

  return normalizedPath.slice(0, lastSlashIndex)
}

function getBaseName(absolutePath: string): string {
  const normalizedPath = absolutePath.replace(/\\/g, '/')
  const lastSlashIndex = normalizedPath.lastIndexOf('/')

  if (lastSlashIndex < 0) {
    return normalizedPath
  }

  return normalizedPath.slice(lastSlashIndex + 1)
}

function joinPath(parentPath: string, segmentName: string): string {
  if (parentPath === '/') {
    return `/${segmentName}`
  }

  return `${parentPath}/${segmentName}`
}

function normalizePath(absolutePath: string): string {
  const trimmedPath = absolutePath.trim().replace(/\\/g, '/')

  if (trimmedPath.length > 1 && trimmedPath.endsWith('/')) {
    return trimmedPath.slice(0, -1)
  }

  return trimmedPath
}
