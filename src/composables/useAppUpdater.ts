import { ref, shallowRef } from 'vue'
import { check, type Update } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

type UpdaterPhase = 'idle' | 'checking' | 'available' | 'installing' | 'ready' | 'error'

const pendingUpdate = shallowRef<Update | null>(null)
const phase = ref<UpdaterPhase>('idle')
const availableVersion = ref<string | null>(null)
const errorMessage = ref<string | null>(null)
const downloadedBytes = ref(0)
const totalBytes = ref<number | null>(null)

export function useAppUpdater() {
  async function checkForUpdate(): Promise<void> {
    if (phase.value === 'checking' || phase.value === 'installing') {
      return
    }

    phase.value = 'checking'
    errorMessage.value = null

    try {
      const update = await check()

      if (update) {
        pendingUpdate.value = update
        availableVersion.value = update.version
        phase.value = 'available'
        console.info(`[updater] update available: ${update.version}`)
      } else {
        phase.value = 'idle'
        console.info('[updater] app is up to date')
      }
    } catch (error) {
      // Offline, private releases, or no published latest.json — fail quietly.
      phase.value = 'error'
      errorMessage.value = error instanceof Error ? error.message : String(error)
      console.warn(`[updater] check failed: ${errorMessage.value}`)
    }
  }

  async function installAndRestart(): Promise<void> {
    const update = pendingUpdate.value
    if (!update) {
      return
    }

    phase.value = 'installing'
    downloadedBytes.value = 0
    totalBytes.value = null

    try {
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          totalBytes.value = event.data.contentLength ?? null
        } else if (event.event === 'Progress') {
          downloadedBytes.value += event.data.chunkLength
        }
      })

      phase.value = 'ready'
      await relaunch()
    } catch (error) {
      phase.value = 'error'
      errorMessage.value = error instanceof Error ? error.message : String(error)
      console.error(`[updater] install failed: ${errorMessage.value}`)
    }
  }

  function dismiss(): void {
    phase.value = 'idle'
    pendingUpdate.value = null
    availableVersion.value = null
  }

  return {
    phase,
    availableVersion,
    errorMessage,
    downloadedBytes,
    totalBytes,
    checkForUpdate,
    installAndRestart,
    dismiss,
  }
}
