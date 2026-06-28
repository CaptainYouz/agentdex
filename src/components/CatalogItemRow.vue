<template>
  <button
    class="catalog-item-row"
    :class="{ selected: isSelected }"
    :title="item.path"
    type="button"
    @click="emit('select', item)"
    @dblclick="emit('reveal', item)"
  >
    <span class="item-name">
      <span
        v-if="pluginName"
        class="item-plugin-name"
      >{{ pluginName }} · </span>{{ item.name }}
    </span>
    <PlatformBadge
      class="item-platform"
      compact
      :platform="item.platform"
    />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import PlatformBadge from '@/components/PlatformBadge.vue'
import type { CatalogItem } from '@/types/catalog.types'
import { extractPluginNameFromCategory } from '@/utils/isPluginCatalogItem'

const props = defineProps<{
  isSelected: boolean
  item: CatalogItem
}>()

const pluginName = computed(() => extractPluginNameFromCategory(props.item.category))

const emit = defineEmits<{
  reveal: [item: CatalogItem]
  select: [item: CatalogItem]
}>()
</script>

<style scoped>
.catalog-item-row {
  align-items: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--text);
  cursor: pointer;
  display: flex;
  gap: 0.5rem;
  justify-content: space-between;
  min-height: 1.75rem;
  padding: 0.35rem 0.45rem;
  text-align: left;
  width: 100%;
}

.catalog-item-row:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

.catalog-item-row.selected {
  background: var(--badge-selected-bg);
  color: var(--badge-selected-text);
  font-weight: 600;
}

.catalog-item-row.selected:hover {
  background: var(--badge-selected-bg);
  color: var(--badge-selected-text);
}

.item-name {
  flex: 1;
  font-size: 0.8rem;
  line-height: 1.3;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-plugin-name {
  color: var(--text-muted);
  font-weight: 500;
}

.item-platform {
  flex-shrink: 0;
}
</style>
