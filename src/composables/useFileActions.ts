import { invoke } from '@tauri-apps/api/core'

import type { ItemFileStats } from '@/types/file.types'

export async function revealItemFile(path: string): Promise<void> {
  await invoke('reveal_item_path', { path })
}

export async function readItemFile(path: string): Promise<string> {
  return invoke<string>('read_item_file', { path })
}

export async function getItemFileStats(path: string): Promise<ItemFileStats> {
  return invoke<ItemFileStats>('get_item_file_stats', { path })
}

export async function writeItemFile(path: string, content: string): Promise<void> {
  await invoke('write_item_file', { path, content })
}

export async function deleteItemFile(path: string): Promise<void> {
  await invoke('delete_item_file', { path })
}
