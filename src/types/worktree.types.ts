export type WorktreeNodeKind = 'folder' | 'file'

export type DirectoryEntry = {
  name: string
  path: string
  kind: WorktreeNodeKind
}

export type WorktreeNode = {
  name: string
  path: string
  kind: WorktreeNodeKind
}

export type WorktreeFileSelection = {
  filePath: string
  fileName: string
}
