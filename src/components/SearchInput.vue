<template>
  <input
    class="search-input"
    :value="modelValue"
    placeholder="Search..."
    type="search"
    @input="onInput"
  >
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function onInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<style scoped>
.search-input {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  flex: 0 0 auto;
  font-size: 0.85rem;
  max-width: 8.75rem;
  min-height: 1.75rem;
  padding: 0.4rem 0.6rem;
  width: 8.75rem;
}

.search-input:focus {
  border-color: var(--accent);
  outline: none;
}
</style>
