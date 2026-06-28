<template>
  <section
    class="group-section"
    :class="{ expanded: isExpanded }"
  >
    <header
      class="group-header"
      @click="toggleExpanded"
    >
      <div class="group-header-start">
        <button
          class="toggle-button"
          :aria-expanded="isExpanded"
          :title="isExpanded ? 'Collapse' : 'Expand'"
          type="button"
          @click.stop="toggleExpanded"
        >
          <svg
            class="chevron"
            :class="{ open: isExpanded }"
            viewBox="0 0 16 16"
            aria-hidden="true"
          >
            <path
              d="M6 4l4 4-4 4"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.75"
            />
          </svg>
        </button>

        <h2 class="group-title">{{ group.label }}</h2>
      </div>

      <div class="group-header-badges">
        <ScopeBadge :scope="group.scope" />
      </div>
    </header>

    <div
      v-show="isExpanded"
      class="group-body"
    >
      <div
        v-for="kindSection in visibleKindSections"
        :key="kindSection.kind"
        class="kind-section"
      >
        <h3 class="kind-subheading">
          {{ kindSection.label }}
          <span class="kind-subheading-count">· {{ kindSection.items.length }}</span>
        </h3>

        <ul class="item-list">
          <li
            v-for="item in kindSection.items"
            :key="item.id"
            class="item-list-entry"
          >
            <CatalogItemRow
              :is-selected="item.id === selectedItemId"
              :item="item"
              @reveal="emit('reveal', $event)"
              @select="emit('select', $event)"
            />
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import CatalogItemRow from '@/components/CatalogItemRow.vue'
import ScopeBadge from '@/components/ScopeBadge.vue'
import { KIND_BADGE_LABELS, KIND_SECTION_ORDER } from '@/constants/catalog.constants'
import type { CatalogItem, MergedCatalogGroup } from '@/types/catalog.types'

const props = defineProps<{
  collapseAllToken: number
  expandAllToken: number
  group: MergedCatalogGroup
  selectedItemId: string | null
}>()

const emit = defineEmits<{
  expandedChange: [isExpanded: boolean]
  reveal: [item: CatalogItem]
  select: [item: CatalogItem]
}>()

const isExpanded = ref(true)

const visibleKindSections = computed(() => {
  return KIND_SECTION_ORDER
    .map((kind) => ({
      kind,
      label: KIND_BADGE_LABELS[kind],
      items: props.group.itemsByKind[kind],
    }))
    .filter((section) => section.items.length > 0)
})

function toggleExpanded() {
  isExpanded.value = !isExpanded.value
}

function groupContainsSelectedItem(selectedItemId: string): boolean {
  return KIND_SECTION_ORDER.some((kind) => {
    return props.group.itemsByKind[kind].some((item) => item.id === selectedItemId)
  })
}

watch(isExpanded, (expanded) => {
  emit('expandedChange', expanded)
}, { immediate: true })

watch(
  () => props.collapseAllToken,
  () => {
    isExpanded.value = false
  },
)

watch(
  () => props.expandAllToken,
  () => {
    isExpanded.value = true
  },
)

watch(
  () => props.selectedItemId,
  (selectedItemId) => {
    if (!selectedItemId) {
      return
    }

    if (groupContainsSelectedItem(selectedItemId)) {
      isExpanded.value = true
    }
  },
)
</script>

<style scoped>
.group-section {
  background: var(--panel-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0.55rem 0.75rem 0.65rem;
}

.group-header {
  align-items: center;
  cursor: pointer;
  display: flex;
  gap: 0.55rem;
  justify-content: space-between;
  padding: 0;
  user-select: none;
}

.group-header-start {
  align-items: center;
  display: flex;
  flex: 1;
  gap: 0.55rem;
  min-width: 0;
}

.group-header-badges {
  align-items: center;
  display: flex;
  flex-shrink: 0;
  gap: 0.35rem;
}

.group-header:hover .group-title {
  color: var(--accent);
}

.group-section.expanded .group-header {
  padding-bottom: 0.5rem;
}

.toggle-button {
  align-items: center;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
  height: 1.5rem;
  justify-content: center;
  padding: 0;
  width: 1.5rem;
}

.toggle-button:hover {
  color: var(--accent);
}

.chevron {
  height: 0.85rem;
  transition: transform 0.15s ease;
  width: 0.85rem;
}

.chevron.open {
  transform: rotate(90deg);
}

.group-title {
  color: var(--text);
  flex: 1;
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.35;
  margin: 0;
  transition: color 0.15s ease;
  word-break: break-word;
}

.group-body {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding-left: 0;
}

.kind-section {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.kind-subheading {
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  margin: 0;
  text-transform: uppercase;
}

.kind-subheading-count {
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.item-list-entry {
  margin: 0;
  padding: 0;
}
</style>
