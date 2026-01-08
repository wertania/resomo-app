<template>
  <div class="flex items-center bg-white dark:bg-surface-900 p-4 pb-2 justify-between">
    <!-- Left: Burger Menu -->
    <div class="flex w-12 items-center justify-start relative z-50">
      <button
        class="flex h-10 w-10 items-center justify-center rounded-xl bg-transparent hover:bg-gray-100 dark:hover:bg-surface-800 transition-colors"
        aria-label="Open menu"
        @click="menuOpen = true"
      >
        <!-- Burger Icon -->
        <svg
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          viewBox="0 0 24 24"
          class="text-surface-900 dark:text-surface-0"
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>
      <MobileMenu :open="menuOpen" @close="menuOpen = false" />
    </div>

    <!-- Title -->
    <h2
      class="text-surface-900 dark:text-surface-0 text-xl font-bold leading-tight tracking-[-0.015em] flex-1 pl-4"
    >
      {{ title }}
    </h2>
  </div>
</template>

<script setup lang="ts">
import MobileMenu from './MobileMenu.vue'

interface Props {
  title?: string
}

withDefaults(defineProps<Props>(), {
  title: '',
})

const menuOpen = ref(false)
</script>

