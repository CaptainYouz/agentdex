<template>
  <span class="kind-badge">
    {{ KIND_BADGE_LABELS[kind] }}
  </span>
</template>

<script setup lang="ts">
import { KIND_BADGE_LABELS } from '@/constants/catalog.constants'
import type { ItemKind } from '@/types/catalog.types'

defineProps<{
  kind: ItemKind
}>()
</script>

<style scoped>
.kind-badge {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-muted);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  line-height: 1;
  padding: 0.2rem 0.45rem;
  text-transform: uppercase;
}
</style>
