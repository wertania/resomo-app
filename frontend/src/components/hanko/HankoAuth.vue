<script setup lang="ts">
import { useRouter } from 'vue-router'
import { onMounted } from 'vue'
import { register } from '@teamhanko/hanko-elements'

const authStore = useAuthStore()
const router = useRouter()

/**
 * Check if user has hanko cookie (authenticated)
 */
const hasHankoCookie = () => {
  return document.cookie
    .split(';')
    .some((item) => item.trim().startsWith('hanko='))
}

const redirectAfterLogin = () => {
  // Small delay to ensure cookie is properly set before redirect
  setTimeout(() => {
    router.push('/')
  }, 100)
}

onMounted(async () => {
  // Register Hanko elements
  await register(authStore.hankoUrl).catch((error) => {
    console.error('Hanko registration error:', error)
  })

  // Check if already authenticated and redirect to home
  if (hasHankoCookie()) {
    router.push('/')
  }
})
</script>

<template>
  <hanko-auth @onSessionCreated="redirectAfterLogin" />
</template>

<style>
hanko-auth {
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
  hanko-auth {
    --background-color: var(--p-surface-900);
    --color: var(--p-surface-0);
    --color-shade-1: var(--p-surface-400);
    --color-shade-2: var(--p-surface-300);
  }
}
</style>
