<template>
  <Home />
  <UpdateBanner />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

import Home from '@/pages/home/Home.vue'
import UpdateBanner from '@/components/UpdateBanner.vue'
import { useAppUpdater } from '@/composables/useAppUpdater'

const { checkForUpdate } = useAppUpdater()

onMounted(() => {
  void checkForUpdate()
})
</script>
