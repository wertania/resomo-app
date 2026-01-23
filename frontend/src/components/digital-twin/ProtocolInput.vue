<template>
  <Card class="h-full">
    <template #title>
      <div class="flex items-center gap-2">
        <IconProtocol class="h-5 w-5 text-emerald-500" />
        <span>{{ $t('DigitalTwin.protocol') }}</span>
      </div>
    </template>
    <template #content>
      <div class="flex flex-col gap-4">
        <!-- Input Mode Toggle -->
        <div class="flex items-center justify-center gap-2">
          <Button
            :severity="inputMode === 'voice' ? 'success' : 'secondary'"
            :outlined="inputMode !== 'voice'"
            size="small"
            @click="inputMode = 'voice'"
          >
            <IconMicrophone class="mr-2 h-4 w-4" />
            {{ $t('DigitalTwin.voiceInput') }}
          </Button>
          <Button
            :severity="inputMode === 'text' ? 'success' : 'secondary'"
            :outlined="inputMode !== 'text'"
            size="small"
            @click="inputMode = 'text'"
          >
            <IconKeyboard class="mr-2 h-4 w-4" />
            {{ $t('DigitalTwin.textInput') }}
          </Button>
        </div>

        <!-- Voice Input -->
        <div v-if="inputMode === 'voice'" class="flex flex-col items-center gap-4">
          <TranscriptionRecorder
            :show-result="false"
            :show-status="true"
            size="md"
            @transcription-complete="handleTranscriptionComplete"
            @error="handleError"
          />
        </div>

        <!-- Text Input -->
        <div v-else class="flex flex-col gap-3">
          <Textarea
            v-model="textInput"
            :placeholder="$t('DigitalTwin.textPlaceholder')"
            rows="4"
            class="w-full"
            :disabled="isSubmitting"
          />
        </div>

        <!-- Transcription Preview (if available) -->
        <div
          v-if="transcription"
          class="rounded-lg bg-surface-100 p-3 dark:bg-surface-700"
        >
          <div class="mb-1 flex items-center justify-between">
            <span class="text-xs font-medium text-gray-500 dark:text-gray-400">
              {{ $t('DigitalTwin.preview') }}
            </span>
            <Button
              severity="secondary"
              text
              size="small"
              class="h-6 w-6 p-0"
              @click="clearTranscription"
            >
              <IconClear class="h-3 w-3" />
            </Button>
          </div>
          <p class="line-clamp-3 text-sm text-gray-700 dark:text-gray-300">
            {{ transcription }}
          </p>
        </div>

        <!-- Apply to Digital Twin Checkbox -->
        <div class="flex items-center gap-2">
          <Checkbox
            v-model="applyToDigitalTwin"
            inputId="applyToDigitalTwin"
            :binary="true"
            :disabled="isSubmitting"
          />
          <label
            for="applyToDigitalTwin"
            class="cursor-pointer text-sm text-surface-700 dark:text-surface-300"
          >
            {{ $t('DigitalTwin.applyToDigitalTwin') }}
          </label>
        </div>

        <!-- Submit Button -->
        <Button
          :label="$t('DigitalTwin.submit')"
          :loading="isSubmitting"
          :disabled="!canSubmit || isSubmitting"
          severity="success"
          class="w-full"
          @click="handleSubmit"
        >
          <template #icon>
            <IconSend class="mr-2 h-4 w-4" />
          </template>
        </Button>

        <!-- Success Message -->
        <div
          v-if="lastSubmission"
          class="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/20"
        >
          <div class="flex items-start gap-2">
            <IconCheck class="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                {{ $t('DigitalTwin.submitted') }}
              </p>
              <p class="mt-1 text-xs text-emerald-600 dark:text-emerald-500">
                {{ lastSubmission.title }}
              </p>
              <p
                v-if="lastSubmission.applied"
                class="mt-1 text-xs text-emerald-600 dark:text-emerald-500"
              >
                <IconBrain class="inline h-3 w-3 mr-1" />
                {{ $t('DigitalTwin.appliedToDigitalTwin', { facts: lastSubmission.processedFacts }) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import TranscriptionRecorder from '@/components/transcription/TranscriptionRecorder.vue'
import { fetcher } from '@/utils/fetcher'
import { useUser } from '@/stores/user'
import { useSettingsStore } from '@/stores/settings'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import IconProtocol from '~icons/line-md/document-list'
import IconMicrophone from '~icons/line-md/play'
import IconKeyboard from '~icons/line-md/text-box'
import IconSend from '~icons/line-md/arrow-right'
import IconClear from '~icons/line-md/close'
import IconCheck from '~icons/line-md/confirm'
import IconBrain from '~icons/line-md/lightbulb'

interface ProtocolResponse {
  success: boolean
  entryId: string
  title: string
  summary: string
}

interface ProcessProtocolResponse {
  success: boolean
  processedFacts: number
  updatedCategories: string[]
  newCategories: string[]
  errors: string[]
}

const { t } = useI18n()
const userStore = useUser()
const settingsStore = useSettingsStore()
const toast = useToast()

const inputMode = ref<'voice' | 'text'>('voice')
const textInput = ref('')
const transcription = ref('')
const isSubmitting = ref(false)
const applyToDigitalTwin = ref(true) // Default: apply to digital twin
const lastSubmission = ref<{ title: string; summary: string; applied?: boolean; processedFacts?: number } | null>(null)

// Get the entry point ID from settings
const entryPointId = computed(() => settingsStore.getDigitalTwinEntryPoint())

// Determine if we can submit
const canSubmit = computed(() => {
  if (!entryPointId.value) return false
  if (inputMode.value === 'voice') {
    return transcription.value.trim().length > 0
  }
  return textInput.value.trim().length > 0
})

// Get the content to submit
const contentToSubmit = computed(() => {
  if (inputMode.value === 'voice') {
    return transcription.value.trim()
  }
  return textInput.value.trim()
})

// Handle transcription complete
const handleTranscriptionComplete = (text: string) => {
  transcription.value = text
}

// Handle error
const handleError = (error: string) => {
  toast.add({
    severity: 'error',
    summary: t('DigitalTwin.error'),
    detail: error,
    life: 5000,
  })
}

// Clear transcription
const clearTranscription = () => {
  transcription.value = ''
}

// Submit protocol
const handleSubmit = async () => {
  if (!canSubmit.value || !entryPointId.value) return

  isSubmitting.value = true
  lastSubmission.value = null

  try {
    // Step 1: Create protocol entry with summarization
    const response = await fetcher.post<ProtocolResponse>(
      `/api/v1/tenant/${userStore.state.selectedTenant}/digital-twin/protocol`,
      {
        entryPointId: entryPointId.value,
        transcript: contentToSubmit.value,
      }
    )

    if (response.success) {
      let applied = false
      let processedFacts = 0

      // Step 2: Apply to digital twin brain if checkbox is checked
      if (applyToDigitalTwin.value) {
        try {
          const processResponse = await fetcher.post<ProcessProtocolResponse>(
            `/api/v1/tenant/${userStore.state.selectedTenant}/digital-twin/process-protocol`,
            {
              entryPointId: entryPointId.value,
              protocol: contentToSubmit.value,
            }
          )

          if (processResponse.success) {
            applied = true
            processedFacts = processResponse.processedFacts || 0

            // Show warnings if any
            if (processResponse.errors && processResponse.errors.length > 0) {
              toast.add({
                severity: 'warn',
                summary: t('DigitalTwin.processingWarnings'),
                detail: processResponse.errors.join(', '),
                life: 5000,
              })
            }
          }
        } catch (processError) {
          console.error('Protocol processing error:', processError)
          toast.add({
            severity: 'warn',
            summary: t('DigitalTwin.processingError'),
            detail: t('DigitalTwin.processingErrorDetail'),
            life: 5000,
          })
        }
      }

      lastSubmission.value = {
        title: response.title,
        summary: response.summary,
        applied,
        processedFacts,
      }

      // Clear inputs
      textInput.value = ''
      transcription.value = ''

      toast.add({
        severity: 'success',
        summary: t('DigitalTwin.success'),
        detail: applied
          ? t('DigitalTwin.protocolCreatedAndApplied', { facts: processedFacts })
          : t('DigitalTwin.protocolCreated'),
        life: 3000,
      })
    }
  } catch (error) {
    console.error('Protocol submission error:', error)
    toast.add({
      severity: 'error',
      summary: t('DigitalTwin.error'),
      detail: error instanceof Error ? error.message : String(error),
      life: 5000,
    })
  } finally {
    isSubmitting.value = false
  }
}

// Clear last submission after some time
watch(lastSubmission, (value) => {
  if (value) {
    setTimeout(() => {
      lastSubmission.value = null
    }, 10000)
  }
})
</script>
