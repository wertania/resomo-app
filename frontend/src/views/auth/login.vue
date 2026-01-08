<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import HankoAuth from '@/components/hanko/HankoAuth.vue'

const authStore = useAuthStore()
const router = useRouter()

onMounted(() => {
  // Redirect to local login if authType is 'local'
  if (authStore.authType === 'local') {
    window.location.href = '/login.html'
  }
})
</script>

<template>
  <div
    v-if="authStore.authType === 'hanko'"
    class="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-50 to-surface-100 dark:from-surface-950 dark:to-surface-900"
  >
    <div
      class="w-full max-w-md p-8 bg-surface-0 dark:bg-surface-900 rounded-xl shadow-xl border border-surface-200 dark:border-surface-700"
    >
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-surface-800 dark:text-surface-100">
          Willkommen
        </h1>
        <p class="text-surface-500 dark:text-surface-400 mt-2">
          Melden Sie sich an, um fortzufahren
        </p>
      </div>
      <HankoAuth />
    </div>
  </div>
</template>

