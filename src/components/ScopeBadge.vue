<template>
  <span class="scope-badge">
    {{ SCOPE_LABELS[scope] }}
  </span>
</template>

<script setup lang="ts">
import { SCOPE_LABELS } from '@/constants/catalog.constants'
import type { ItemScope } from '@/types/catalog.types'

defineProps<{
  scope: ItemScope
}>()
</script>

<style scoped>
.scope-badge {
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
