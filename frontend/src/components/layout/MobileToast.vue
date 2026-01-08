<template>
  <div
    :class="[
      'flex items-start p-4 mb-3 rounded-lg border-l-4 cursor-pointer transition-all duration-200 hover:shadow-md',
      getColorClasses(notification.type),
    ]"
    @click="handleClick"
    @keydown="handleKeydown"
    role="button"
    tabindex="0"
  >
    <!-- Icon -->
    <div class="flex-shrink-0 mr-3">
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 16 16">
        <path :d="getIcon(notification.type)" />
      </svg>
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium">
        {{ notification.message }}
      </p>
      <p class="text-xs opacity-75 mt-1">
        {{ formatTime(notification.timestamp) }}
      </p>
    </div>

    <!-- Close hint -->
    <div class="flex-shrink-0 ml-3">
      <svg class="w-4 h-4 opacity-50" fill="currentColor" viewBox="0 0 16 16">
        <path
          d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"
        />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNotificationStore } from '@/stores/notifications'
import type { Notification } from '@/stores/notifications'

interface Props {
  notification: Notification
}

const props = defineProps<Props>()

const notificationStore = useNotificationStore()

function handleClick() {
  notificationStore.removeNotification(props.notification.id)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    handleClick()
  }
}

function getColorClasses(type: Notification['type']): string {
  switch (type) {
    case 'standard':
      return 'bg-green-100 border-green-400 text-green-800'
    case 'critical':
      return 'bg-yellow-100 border-yellow-400 text-yellow-800'
    case 'very_critical':
      return 'bg-red-100 border-red-400 text-red-800'
    default:
      return 'bg-gray-100 border-gray-400 text-gray-800'
  }
}

function getIcon(type: Notification['type']): string {
  switch (type) {
    case 'standard':
      return 'M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.061L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z'
    case 'critical':
      return 'M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z'
    case 'very_critical':
      return 'M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z'
    default:
      return ''
  }
}

function formatTime(timestamp: Date): string {
  return timestamp.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

