<script setup lang="ts">
import { onMounted } from 'vue'
import { register } from '@teamhanko/hanko-elements'

const hankoApi = import.meta.env.VITE_HANKO_API_URL
const isHankoEnabled = !!hankoApi && hankoApi.trim() !== ''

onMounted(() => {
  if (isHankoEnabled) {
    register(hankoApi).catch((error) => {
      console.error('Hanko registration error:', error)
    })
  } else {
    console.warn('Hanko API URL is not configured, skipping registration')
  }
})
</script>

<template>
  <hanko-profile v-if="isHankoEnabled" />
</template>

<style>
hanko-profile {
  --color: var(--p-text-color);
  --color-shade-1: var(--p-text-muted-color);
  --color-shade-2: var(--p-text-hover-muted-color);
  --brand-color: var(--p-primary-color);
  --brand-color-shade-1: var(--p-primary-hover-color);
  --brand-contrast-color: var(--p-primary-contrast-color);
  --background-color: var(--p-surface-0);
  --error-color: #ef4444;
  --link-color: var(--p-primary-color);
  --font-family: inherit;
  --font-size: 14px;
  --font-weight: 400;
  --headline1-font-size: 24px;
  --headline1-font-weight: 600;
  --headline2-font-size: 16px;
  --headline2-font-weight: 600;
  --border-radius: var(--p-content-border-radius);
  --item-height: 40px;
  --item-margin: 12px 0;
  --container-padding: 24px;
  --container-max-width: 400px;
  --input-min-width: 200px;
}

@media (prefers-color-scheme: dark) {
  hanko-profile {
    --background-color: var(--p-surface-900);
    --color: var(--p-surface-0);
    --color-shade-1: var(--p-surface-400);
    --color-shade-2: var(--p-surface-300);
  }
}
</style>

