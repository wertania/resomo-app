<script setup lang="ts">
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()

const logout = async () => {
  await authStore.logout()
}
</script>

<template>
  <button
    v-if="authStore.authType === 'hanko'"
    @click="logout"
    class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 transition-colors duration-200 font-medium text-sm cursor-pointer"
  >
    <slot>Logout</slot>
  </button>
</template>

