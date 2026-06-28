<template>
  <span
    class="platform-badge"
    :class="[PLATFORM_BADGE_CLASS[platform], { compact }]"
  >
    {{ PLATFORM_LABELS[platform] }}
  </span>
</template>

<script setup lang="ts">
import { PLATFORM_BADGE_CLASS, PLATFORM_LABELS } from '@/constants/catalog.constants'
import type { ItemPlatform } from '@/types/catalog.types'

defineProps<{
  compact?: boolean
  platform: ItemPlatform
}>()
</script>

<style scoped>
.platform-badge {
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1;
  padding: 0.2rem 0.45rem;
  text-transform: uppercase;
}

.platform-badge.compact {
  font-size: 0.62rem;
  letter-spacing: 0.01em;
  padding: 0.12rem 0.35rem;
}

.platform-cursor {
  background: rgba(110, 168, 255, 0.12);
  color: #8eb8ff;
}

.platform-claude {
  background: rgba(217, 119, 87, 0.12);
  color: #f0a27f;
}

.platform-codex {
  background: rgba(16, 163, 127, 0.14);
  color: #6fd4a8;
}

.platform-shared {
  background: rgba(125, 211, 160, 0.12);
  color: #8fd9b0;
}
</style>
