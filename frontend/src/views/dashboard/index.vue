<template>
  <div class="min-h-full bg-surface-50 p-6 dark:bg-surface-900">
    <div class="mx-auto max-w-7xl">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-0">
          {{ $t('Dashboard.title') }}
        </h1>
        <p class="mt-2 text-surface-600 dark:text-surface-400">
          {{ $t('Dashboard.subtitle') }}
        </p>
      </div>

      <!-- Protocol Tile (full width) -->
      <div class="mb-6">
        <ProtocolInput />
      </div>

      <!-- Dashboard Grid -->
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <!-- Future tiles will be added here -->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ProtocolInput from '@/components/digital-twin/ProtocolInput.vue'
</script>
