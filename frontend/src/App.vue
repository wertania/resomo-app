<script setup lang="ts">
import { useUser } from '@/stores/user'

const userStore = useUser()

onMounted(async () => {
  await userStore.init()
})
</script>

<template>
  <Toast position="top-center" />
  <ConfirmDialog />
  <RouterView />
</template>
