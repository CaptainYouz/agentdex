<template>
  <div class="filter-tabs">
    <template
      v-for="(group, groupIndex) in FILTER_OPTION_GROUPS"
      :key="groupIndex"
    >
      <div class="filter-tab-group">
        <button
          v-for="option in group.options"
          :key="option.id"
          class="filter-tab"
          :class="{ active: option.id === activeFilter }"
          type="button"
          @click="emit('update:activeFilter', option.id)"
        >
          {{ option.label }}
        </button>
      </div>
      <span
        v-if="groupIndex < FILTER_OPTION_GROUPS.length - 1"
        class="filter-tab-divider"
        aria-hidden="true"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { FILTER_OPTION_GROUPS } from '@/constants/catalog.constants'
import type { FilterMode } from '@/types/catalog.types'

defineProps<{
  activeFilter: FilterMode
}>()

const emit = defineEmits<{
  'update:activeFilter': [value: FilterMode]
}>()
</script>

<style scoped>
.filter-tabs {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.filter-tab-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.filter-tab-divider {
  background: var(--border);
  flex-shrink: 0;
  height: 1.1rem;
  margin: 0 0.1rem;
  width: 1px;
}

.filter-tab {
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius);
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.82rem;
  padding: 0.35rem 0.6rem;
}

.filter-tab:hover {
  color: var(--text);
}

.filter-tab.active {
  background: var(--accent-soft);
  border-color: var(--border);
  color: var(--accent);
}
</style>
