<template>
  <div class="main-content min-h-full px-6 py-8 lg:px-8">
    <div class="mx-auto max-w-4xl">
      <!-- Page Title -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold leading-9 tracking-tight text-color">
          {{ $t('UserProfile.title') }}
        </h1>
      </div>

      <div class="grid gap-8 lg:grid-cols-1">
        <!-- Profile Information Section -->
        <div
          class="rounded-xl border border-surface-200 bg-surface-0 p-6 shadow-sm dark:border-surface-700 dark:bg-surface-900"
        >
          <h2 class="mb-6 text-xl font-semibold text-color">
            {{ $t('UserProfile.personalInfo') }}
          </h2>

          <!-- Profile Image Section -->
          <div class="mb-6 text-center">
            <img
              :src="profileImageUrl"
              :alt="$t('UserProfile.imageAlt')"
              class="mx-auto mb-4 h-32 w-32 rounded-full object-cover ring-4 ring-surface-200 dark:ring-surface-700"
            />

            <!-- File Upload Button -->
            <div class="flex justify-center">
              <Button
                @click="fileUploadRef?.choose()"
                outlined
                rounded
                :disabled="isLoading"
              >
                <IconFaSolidImages class="mr-2" />
                <span>{{ $t('UserProfile.changeImage') }}</span>
              </Button>
            </div>

            <!-- File Upload Component -->
            <FileUpload
              ref="fileUploadRef"
              auto
              :customUpload="true"
              @uploader="handleFileUpload"
              :multiple="false"
              accept="image/*"
              :maxFileSize="1000000"
              class="hidden"
            >
              <template #empty>
                <div class="flex flex-col items-center justify-center p-8">
                  <IconFaSolidCloudUploadAlt
                    class="mb-4 text-4xl text-gray-400"
                  />
                  <p class="text-gray-600">
                    {{ $t('UserProfile.dropzoneText') }}
                  </p>
                </div>
              </template>
            </FileUpload>
          </div>

          <!-- Profile Form -->
          <form @submit.prevent="updateProfile" class="space-y-6">
            <div>
              <label
                for="firstname"
                class="block text-sm font-medium leading-6 text-color mb-2"
              >
                {{ $t('UserProfile.firstname') }}
              </label>
              <InputText
                id="firstname"
                v-model="userProfile.firstname"
                class="w-full"
                :disabled="isLoading"
              />
            </div>

            <div>
              <label
                for="surname"
                class="block text-sm font-medium leading-6 text-color mb-2"
              >
                {{ $t('UserProfile.surname') }}
              </label>
              <InputText
                id="surname"
                v-model="userProfile.surname"
                class="w-full"
                :disabled="isLoading"
              />
            </div>

            <div>
              <Button
                type="submit"
                :label="$t('UserProfile.updateButton')"
                class="button-primary w-full"
                :loading="isLoading"
              />
            </div>
          </form>
        </div>

        <!-- Security Section -->
        <div
          class="rounded-xl border border-surface-200 bg-surface-0 p-6 shadow-sm dark:border-surface-700 dark:bg-surface-900"
          v-if="authStore.authType === 'hanko'"
        >
          <div class="mb-6 flex items-center justify-between">
            <div>
              <h2 class="text-xl font-semibold text-color">
                {{ $t('UserProfile.security') }}
              </h2>
              <p class="mt-1 text-sm text-surface-600 dark:text-surface-400">
                {{ $t('UserProfile.securityDescription') }}
              </p>
            </div>
            <HankoLogoutButton />
          </div>
          <div
            class="rounded-lg border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800"
          >
            <HankoProfile />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import IconFaSolidImages from '~icons/fa-solid/images'
import IconFaSolidCloudUploadAlt from '~icons/fa-solid/cloud-upload-alt'

const { state } = useApp()
const toast = useToast()
const { t } = useI18n()
const authStore = useAuthStore()

// File upload ref
interface FileUploadInstance {
  choose: () => void
  clear: () => void
}
const fileUploadRef = ref<FileUploadInstance | null>(null)

type UserProfile = {
  email: string
  firstname: string
  surname: string
  profileImageName: string
  phoneNumber: string
  phoneNumberVerified: boolean
}

// State
const isLoading = ref(false)
const userProfile = ref({
  email: '',
  firstname: '',
  surname: '',
  profileImageName: '',
  phoneNumber: '',
  phoneNumberVerified: false,
})

// Computed
const profileImageUrl = computed(() => {
  if (state.selectedTenant == null) {
    return ''
  }
  return userProfile.value.profileImageName
    ? `/api/v1/user/profile-image`
    : 'images/user.png'
})

// Methods
const fetchProfile = async () => {
  try {
    const data = await fetcher.get<UserProfile>('/api/v1/user/me')
    userProfile.value = data
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: t('error'),
      detail: t('UserProfile.fetchError'),
      life: 3000,
    })
  }
}

const updateProfile = async () => {
  isLoading.value = true
  try {
    const data = await fetcher.put<UserProfile>(
      '/api/v1/user/me',
      userProfile.value,
    )
    userProfile.value = data
    toast.add({
      severity: 'success',
      summary: t('success'),
      detail: t('UserProfile.updateSuccess'),
      life: 3000,
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: t('error'),
      detail: t('UserProfile.updateError'),
      life: 3000,
    })
  } finally {
    isLoading.value = false
  }
}

const handleFileUpload = async (event: any) => {
  console.log('handleFileUpload', event)
  const file = Array.isArray(event.files) ? event.files[0] : event.files
  if (!file) {
    console.log('no file')
    toast.add({
      severity: 'error',
      summary: t('error'),
      detail: t('UserProfile.imageUploadError'),
      life: 3000,
    })
    return
  }

  const formData = new FormData()
  formData.append('file', file)

  isLoading.value = true
  try {
    await fetcher.postFormData<{}>(`/api/v1/user/profile-image`, formData)
    await fetchProfile()
    toast.add({
      severity: 'success',
      summary: t('success'),
      detail: t('UserProfile.imageUploadSuccess'),
      life: 3000,
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: t('error'),
      detail: t('UserProfile.imageUploadError'),
      life: 3000,
    })
  } finally {
    isLoading.value = false
  }
}

// Lifecycle
onMounted(() => {
  fetchProfile()
})
</script>
