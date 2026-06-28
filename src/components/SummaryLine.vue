<template>
  <p
    v-if="displayText"
    class="summary-line"
  >
    {{ displayText }}
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { CatalogSummary } from '@/types/catalog.types'
import { buildCatalogSummaryLine } from '@/utils/buildCatalogSummaryLine'

const props = defineProps<{
  summary: CatalogSummary | null
  isLoading: boolean
}>()

const displayText = computed(() => {
  if (props.isLoading) {
    return 'Scanning...'
  }

  if (!props.summary) {
    return ''
  }

  return buildCatalogSummaryLine(props.summary)
})
</script>

<style scoped>
.summary-line {
  color: var(--text-muted);
  font-size: 0.75rem;
  margin: 0;
}
</style>
