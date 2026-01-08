<template>
  <div
    class="relative flex flex-col h-[100dvh] w-full bg-white dark:bg-surface-900"
    style="font-family: Manrope, 'Noto Sans', Inter, system-ui, sans-serif;"
  >
    <!-- Header (fixed) -->
    <div class="flex-shrink-0 z-20">
      <MobileHeader :title="headerTitle" />
    </div>

    <!-- Notification Toasts (overlay, top right) -->
    <div
      v-if="notifications.length > 0"
      class="fixed top-4 right-4 left-4 z-30 space-y-2 pointer-events-none"
    >
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="pointer-events-auto"
      >
        <MobileToast :notification="notification" />
      </div>
    </div>

    <!-- Main content (scrollable, footer is in-flow) -->
    <main class="flex-1 overflow-y-auto px-0 py-0 w-full">
      <RouterView />
    </main>

    <!-- Navigation Footer (in-flow, safe-area aware) -->
    <div class="flex-shrink-0 z-20">
      <NavigationFooter />
    </div>
  </div>
</template>

<script setup lang="ts">
import MobileHeader from './MobileHeader.vue'
import NavigationFooter from './NavigationFooter.vue'
import MobileToast from './MobileToast.vue'
import { useNotificationStore } from '@/stores/notifications'
import { useRoute } from 'vue-router'

const notificationStore = useNotificationStore()
const notifications = computed(() => notificationStore.notifications)
const route = useRoute()

// Get header title from route meta or default
const headerTitle = computed(() => {
  // Check if current route has headerTitle in meta
  if (route.meta.headerTitle) {
    return route.meta.headerTitle as string
  }
  // For archive-entry, get title from the entry
  if (route.name === 'MobileArchiveEntry') {
    // This will be handled by the ArchiveEntry component updating route meta
    return 'Archiv Entry'
  }
  return ''
})
</script>

