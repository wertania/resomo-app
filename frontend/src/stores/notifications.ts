import { defineStore } from 'pinia'

export interface Notification {
  id: string
  message: string
  type: 'standard' | 'critical' | 'very_critical'
  timestamp: Date
}

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([])

  function addNotification(notification: Notification) {
    notifications.value.push(notification)
  }

  function removeNotification(id: string) {
    notifications.value = notifications.value.filter((n) => n.id !== id)
  }

  function generateRandomNotification(): Notification {
    const predefinedMessages = [
      {
        message: 'Notruf Zimmer 23 - Bewohner benötigt Hilfe',
        type: 'very_critical' as const,
      },
      {
        message: 'Rufanlage Zimmer 15 - Batterie schwach',
        type: 'critical' as const,
      },
      {
        message: 'Ruf beantwortet - Zimmer 08 versorgt',
        type: 'standard' as const,
      },
    ]

    const randomIndex = Math.floor(Math.random() * predefinedMessages.length)
    const randomMessage = predefinedMessages[randomIndex]

    if (!randomMessage) {
      // Fallback notification if array is empty (should never happen)
      return {
        id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        message: 'Notification',
        type: 'standard' as const,
        timestamp: new Date(),
      }
    }

    return {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: randomMessage.message,
      type: randomMessage.type,
      timestamp: new Date(),
    }
  }

  function addRandomNotification() {
    const notification = generateRandomNotification()
    addNotification(notification)
  }

  return {
    notifications: readonly(notifications),
    addNotification,
    removeNotification,
    addRandomNotification,
  }
})

