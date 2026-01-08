<script setup lang="ts">
import HankoProfile from '@/components/hanko/HankoProfile.vue'
import HankoLogoutButton from '@/components/hanko/HankoLogoutButton.vue'
</script>

<template>
  <div class="max-w-2xl mx-auto p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-surface-800 dark:text-surface-100">
        Profile Settings
      </h1>
      <HankoLogoutButton />
    </div>
    <div
      class="bg-surface-0 dark:bg-surface-900 rounded-xl shadow-lg border border-surface-200 dark:border-surface-700 p-6"
    >
      <HankoProfile />
    </div>
  </div>
</template>



