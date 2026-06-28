export function collectAncestorFolderPaths(
  worktreeRoot: string,
  selectedFilePath: string,
): string[] {
  const normalizedRoot = normalizePath(worktreeRoot)
  const normalizedFilePath = normalizePath(selectedFilePath)

  if (!normalizedFilePath.startsWith(normalizedRoot)) {
    return []
  }

  const relativePath = normalizedFilePath.slice(normalizedRoot.length)
  const relativeSegments = relativePath.split('/').filter((segment) => segment.length > 0)

  if (relativeSegments.length <= 1) {
    return [normalizedRoot]
  }

  const folderPaths = [normalizedRoot]
  let currentPath = normalizedRoot

  for (let segmentIndex = 0; segmentIndex < relativeSegments.length - 1; segmentIndex += 1) {
    currentPath = joinPath(currentPath, relativeSegments[segmentIndex])
    folderPaths.push(currentPath)
  }

  return folderPaths
}

function normalizePath(absolutePath: string): string {
  const trimmedPath = absolutePath.trim().replace(/\\/g, '/')

  if (trimmedPath.length > 1 && trimmedPath.endsWith('/')) {
    return trimmedPath.slice(0, -1)
  }

  return trimmedPath
}

function joinPath(parentPath: string, segmentName: string): string {
  if (parentPath === '/') {
    return `/${segmentName}`
  }

  return `${parentPath}/${segmentName}`
}
