<template>
  <div
    class="main-content flex min-h-full flex-col justify-center px-6 py-12 lg:px-8"
  >
    <!-- Profile Container -->
    <div class="sm:mx-auto sm:w-full sm:max-w-sm">
      <h2
        class="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-color"
      >
        {{ $t('UserProfile.title') }}
      </h2>
    </div>

    <div class="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
      <!-- Profile Image Section -->
      <div class="mb-6 text-center">
        <img
          :src="profileImageUrl"
          :alt="$t('UserProfile.imageAlt')"
          class="mx-auto mb-4 h-32 w-32 rounded-full object-cover"
        />

        <!-- File Upload Button -->
        <div class="flex justify-center gap-2">
          <Button 
            @click="fileUploadRef?.choose()" 
            class="p-2" 
            outlined 
            rounded
            :disabled="isLoading"
          >
            <IconFaSolidImages />
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
              <IconFaSolidCloudUploadAlt class="mb-4 text-4xl text-gray-400" />
              <p class="text-gray-600">{{ $t('UserProfile.dropzoneText') }}</p>
            </div>
          </template>
        </FileUpload>
      </div>

      <!-- Profile Form -->
      <form @submit.prevent="updateProfile" class="space-y-6">
        <div>
          <label
            for="email"
            class="block text-sm font-medium leading-6 text-color"
          >
            {{ $t('UserProfile.email') }}
          </label>
          <InputText
            id="email"
            v-model="userProfile.email"
            type="email"
            class="mt-2 w-full"
            readonly
          />
        </div>

        <div>
          <label
            for="firstname"
            class="block text-sm font-medium leading-6 text-color"
          >
            {{ $t('UserProfile.firstname') }}
          </label>
          <InputText
            id="firstname"
            v-model="userProfile.firstname"
            class="mt-2 w-full"
          />
        </div>

        <div>
          <label
            for="surname"
            class="block text-sm font-medium leading-6 text-color"
          >
            {{ $t('UserProfile.surname') }}
          </label>
          <InputText
            id="surname"
            v-model="userProfile.surname"
            class="mt-2 w-full"
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

        <!-- Add Password Change Button -->
        <div>
          <Button
            type="button"
            :label="$t('UserPassword.changeButton')"
            class="secondary-btn w-full"
            @click="navigateToPassword"
            outlined
          />
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import IconFaSolidImages from '~icons/line-md/image'
import IconFaSolidCloudUploadAlt from '~icons/line-md/cloud-alt-upload'

const { state } = useUser()
const toast = useToast()
const { t } = useI18n()
const router = useRouter()

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
const initialPhoneNumber = ref('')
const pin = ref('')
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

// Add these new refs
const uploadProgress = ref(0)
const currentFileSize = ref(0)

// Methods
const fetchProfile = async () => {
  try {
    const data = await fetcher.get<UserProfile>('/api/v1/user/me')
    userProfile.value = data
    initialPhoneNumber.value = data.phoneNumber
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
    initialPhoneNumber.value = data.phoneNumber
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
  const file = Array.isArray(event.files) ? event.files[0] : event.files
  if (!file) {
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

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const navigateToPassword = () => {
  router.push('/change-pwd')
}

// Lifecycle
onMounted(() => {
  fetchProfile()
})
</script>
