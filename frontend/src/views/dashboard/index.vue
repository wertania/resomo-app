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

      <!-- Protocol Tile (full width, only visible when Digital Twin entry point is set) -->
      <div v-if="hasDigitalTwinEntryPoint" class="mb-6">
        <ProtocolInput />
      </div>

      <!-- Dashboard Grid -->
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <!-- Welcome Tile (shown when no Digital Twin is configured) -->
        <WelcomeTile v-if="!hasDigitalTwinEntryPoint" @setup-click="navigateToWiki" />

        <!-- Future tiles will be added here -->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings'
import { useRouter } from 'vue-router'
import { useUser } from '@/stores/user'
import ProtocolInput from '@/components/digital-twin/ProtocolInput.vue'
import WelcomeTile from '@/components/dashboard/WelcomeTile.vue'

const settingsStore = useSettingsStore()
const router = useRouter()
const userStore = useUser()

// Check if Digital Twin entry point is configured
const hasDigitalTwinEntryPoint = computed(() => {
  return !!settingsStore.getDigitalTwinEntryPoint()
})

// Load settings on mount
onMounted(async () => {
  await settingsStore.loadUserSettings()
})

// Navigate to wiki to set up Digital Twin
const navigateToWiki = () => {
  const tenantId = userStore.state.selectedTenant
  if (tenantId) {
    router.push(`/tenant/${tenantId}/wiki`)
  }
}
</script>
