<template>
  <Icon
    :icon="iconId"
    :width="size"
    :height="size"
    class="codicon-icon"
  />
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed } from 'vue'

import type { CodiconName } from '@/types/codicon.types'
import { codiconId } from '@/utils/registerCodicons'

const props = withDefaults(
  defineProps<{
    name: CodiconName
    size?: number
  }>(),
  {
    size: 16,
  },
)

const iconId = computed(() => codiconId(props.name))
</script>

<style scoped>
.codicon-icon {
  display: block;
  flex-shrink: 0;
}
</style>
