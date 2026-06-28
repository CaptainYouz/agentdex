const IS_CASE_INSENSITIVE_PATHS = /^(Win|Mac|iPhone|iPad)/i.test(navigator.platform)

export function normalizeFilePath(absolutePath: string): string {
  const trimmedPath = absolutePath.trim().replace(/\\/g, '/')

  if (trimmedPath.length > 1 && trimmedPath.endsWith('/')) {
    return trimmedPath.slice(0, -1)
  }

  return trimmedPath
}

export function pathsMatch(leftPath: string, rightPath: string): boolean {
  const normalizedLeftPath = normalizeFilePath(leftPath)
  const normalizedRightPath = normalizeFilePath(rightPath)

  if (IS_CASE_INSENSITIVE_PATHS) {
    return normalizedLeftPath.toLowerCase() === normalizedRightPath.toLowerCase()
  }

  return normalizedLeftPath === normalizedRightPath
}
