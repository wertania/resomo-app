<template>
  <div
    class="main-content flex min-h-full flex-col justify-center px-6 py-12 lg:px-8"
  >
    <!-- Back to Profile Link -->
    <div class="sm:mx-auto sm:w-full sm:max-w-sm">
      <RouterLink
        to="/user"
        class="flex items-center text-color transition-colors duration-200 hover:text-color-secondary"
      >
        <IconArrowLeft class="mr-2 text-color" />
        {{ $t('UserProfile.backToProfile') }}
      </RouterLink>
    </div>

    <!-- Password Change Container -->
    <div class="sm:mx-auto sm:w-full sm:max-w-sm">
      <h2
        class="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-color"
      >
        {{ $t('UserPassword.title') }}
      </h2>
    </div>

    <div class="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
      <!-- Password Change Form -->
      <form @submit.prevent="changePassword" class="space-y-6">
        <div>
          <label
            for="currentPassword"
            class="block text-sm font-medium leading-6 text-color"
          >
            {{ $t('UserPassword.current') }}
          </label>
          <InputText
            type="password"
            id="currentPassword"
            v-model="passwordData.currentPassword"
            class="mt-2 w-full"
            :feedback="false"
            toggleMask
          />
        </div>

        <div>
          <label
            for="newPassword"
            class="block text-sm font-medium leading-6 text-color"
          >
            {{ $t('UserPassword.new') }}
          </label>
          <InputText
            type="password"
            id="newPassword"
            v-model="passwordData.newPassword"
            class="mt-2 w-full"
            :feedback="true"
            toggleMask
          />
        </div>

        <div>
          <label
            for="confirmPassword"
            class="block text-sm font-medium leading-6 text-color"
          >
            {{ $t('UserPassword.confirm') }}
          </label>
          <InputText
            type="password"
            id="confirmPassword"
            v-model="passwordData.confirmPassword"
            class="mt-2 w-full"
            :feedback="false"
            toggleMask
          />
        </div>

        <div>
          <Button
            type="submit"
            :label="$t('UserPassword.changeButton')"
            class="button-primary w-full"
            :loading="isLoading"
          />
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToast } from 'primevue/usetoast'
import IconArrowLeft from '~icons/line-md/arrow-left'

const toast = useToast()
const { t } = useI18n()

// State
const isLoading = ref(false)
const passwordData = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

// Methods
const changePassword = async () => {
  if (passwordData.value.newPassword !== passwordData.value.confirmPassword) {
    toast.add({
      severity: 'error',
      summary: t('error'),
      detail: t('UserPassword.mismatch'),
      life: 3000,
    })
    return
  }

  isLoading.value = true
  try {
    const response = await fetcher.put('/api/v1/user/me/password', {
      oldPassword: passwordData.value.currentPassword,
      newPassword: passwordData.value.newPassword,
    })
    toast.add({
      severity: 'success',
      summary: t('success'),
      detail: t('UserPassword.changeSuccess'),
      life: 3000,
    })
    // Reset form
    passwordData.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: t('error'),
      detail: t('UserPassword.changeError'),
      life: 3000,
    })
  } finally {
    isLoading.value = false
  }
}
</script>
