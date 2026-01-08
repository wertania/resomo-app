<script setup lang="ts">
import { useApp } from '@/stores/main'

const appStore = useApp()

onMounted(async () => {
  await appStore.init()
})
</script>

<template>
  <Toast position="top-center" />
  <ConfirmDialog />
  <RouterView />
</template>
