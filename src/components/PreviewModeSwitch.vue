<template>
  <div class="preview-mode-switch">
    <button
      v-for="option in PREVIEW_MODE_OPTIONS"
      :key="option.id"
      class="mode-button"
      :class="{ active: modelValue === option.id }"
      :title="option.title"
      type="button"
      @click="emit('update:modelValue', option.id)"
    >
      <CodiconIcon
        :name="option.icon"
        :size="16"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import CodiconIcon from '@/components/CodiconIcon.vue'
import { PREVIEW_MODE_OPTIONS } from '@/constants/preview.constants'
import type { PreviewMode } from '@/types/preview.types'

defineProps<{
  modelValue: PreviewMode
}>()

const emit = defineEmits<{
  'update:modelValue': [value: PreviewMode]
}>()
</script>

<style scoped>
.preview-mode-switch {
  display: flex;
  overflow: hidden;
}

.mode-button {
  align-items: center;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  height: 1.65rem;
  justify-content: center;
  padding: 0;
  width: 1.85rem;
}

.mode-button + .mode-button {
  border-left: none;
}

.mode-button:first-child {
  border-bottom-left-radius: 4px;
  border-top-left-radius: 4px;
}

.mode-button:last-child {
  border-bottom-right-radius: 4px;
  border-top-right-radius: 4px;
}

.mode-button:hover {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
}

.mode-button.active {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text);
}
</style>
