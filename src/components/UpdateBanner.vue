<template>
  <Transition name="update-slide">
    <div v-if="isVisible" class="update-banner" role="status">
      <div class="update-banner__text">
        <template v-if="phase === 'available'">
          <strong>Update available</strong>
          <span v-if="availableVersion"> — v{{ availableVersion }}</span>
        </template>
        <template v-else-if="phase === 'installing'">
          <strong>Downloading update…</strong>
          <span v-if="progressLabel"> {{ progressLabel }}</span>
        </template>
        <template v-else-if="phase === 'ready'">
          <strong>Restarting…</strong>
        </template>
      </div>

      <div v-if="phase === 'available'" class="update-banner__actions">
        <button type="button" class="update-banner__btn update-banner__btn--primary" @click="installAndRestart">
          Install &amp; restart
        </button>
        <button type="button" class="update-banner__btn" @click="dismiss">Later</button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useAppUpdater } from '@/composables/useAppUpdater'

const {
  phase,
  availableVersion,
  downloadedBytes,
  totalBytes,
  installAndRestart,
  dismiss,
} = useAppUpdater()

const isVisible = computed(() => ['available', 'installing', 'ready'].includes(phase.value))

const progressLabel = computed(() => {
  if (!totalBytes.value) {
    return ''
  }
  const percent = Math.min(100, Math.round((downloadedBytes.value / totalBytes.value) * 100))
  return `${percent}%`
})
</script>

<style scoped>
.update-banner {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 16px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--text);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  font-size: 13px;
}

.update-banner__text strong {
  font-weight: 600;
}

.update-banner__actions {
  display: flex;
  gap: 8px;
}

.update-banner__btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--panel-muted);
  color: var(--text);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.update-banner__btn:hover {
  border-color: var(--accent);
}

.update-banner__btn--primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #06121f;
}

.update-slide-enter-active,
.update-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.update-slide-enter-from,
.update-slide-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}
</style>
