<template>
  <Card class="h-64">
    <template #title>
      <div class="flex items-center gap-2">
        <IconInfo class="h-5 w-5 text-blue-500" />
        <span>{{ $t('Dashboard.welcome') }}</span>
      </div>
    </template>
    <template #content>
      <p class="text-surface-600 dark:text-surface-400">
        {{ $t('Dashboard.welcomeMessage') }}
      </p>
      <div class="mt-4">
        <Button
          :label="$t('Dashboard.setupDigitalTwin')"
          severity="info"
          outlined
          @click="handleSetupClick"
        />
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import IconInfo from '~icons/line-md/alert-circle'

interface Emits {
  (e: 'setup-click'): void
}

const emit = defineEmits<Emits>()

const handleSetupClick = () => {
  emit('setup-click')
}
</script>
