<template>
  <div class="flex flex-col items-center justify-center gap-8 py-12 px-4">
      <h1 class="text-4xl font-bold text-[#a27029] dark:text-primary-400">
        Dein Account
      </h1>

      <div v-if="loading" class="text-gray-500 dark:text-surface-400">
        Lade Account…
      </div>
      <div v-else-if="error" class="text-red-600 dark:text-red-400">
        {{ error }}
      </div>
      <template v-else-if="account">
        <!-- Avatar (fallback to logo) -->
        <img
          :src="logoImage"
          alt="Avatar"
          class="w-24 h-24 rounded-full border-4 border-[#5f8353] dark:border-primary-500 shadow-md object-cover"
        />

        <div
          class="w-full max-w-md bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-xl shadow p-6"
        >
          <div class="text-2xl font-semibold text-[#5f8353] dark:text-primary-400 mb-1">
            {{ account.name }}
          </div>
          <div class="text-sm text-gray-500 dark:text-surface-400 mb-4">
            Konto erstellt: {{ formatDate(account.created_at) }}
          </div>
        </div>
      </template>
  </div>
</template>

<script setup lang="ts">
import { useNotificationStore } from '@/stores/notifications'
import logoImage from '@/assets/logo.png'

interface AccountResponse {
  id: number
  created_at: string
  name: string
  uuid: string
  password?: string
}

const notificationStore = useNotificationStore()

const loading = ref(true)
const error = ref<string | null>(null)
const account = ref<AccountResponse | null>(null)

const ACCOUNT_URL = import.meta.env.VITE_API_USER as string | undefined

function formatDate(dateStr?: string) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleString('de-DE')
}

onMounted(async () => {
  loading.value = true
  error.value = null
  try {
    if (!ACCOUNT_URL) {
      throw new Error('VITE_API_USER is not configured')
    }
    const userSession =
      (typeof window !== 'undefined' && localStorage.getItem('userSession')) ||
      ''
    const res = await fetch(ACCOUNT_URL, {
      method: 'GET',
      headers: { 'X-USER-SESSION-ID': userSession },
    })
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }
    const data: AccountResponse = await res.json()
    account.value = data
  } catch (e: any) {
    error.value = e?.message || 'Failed to load account.'
    notificationStore.addNotification({
      id: `acct_${Date.now()}`,
      message: error.value + '',
      type: 'critical',
      timestamp: new Date(),
    })
  } finally {
    loading.value = false
  }
})
</script>

