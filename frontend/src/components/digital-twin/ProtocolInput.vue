<template>
  <Card class="overflow-hidden border-0 shadow-lg">
    <template #content>
      <div class="flex flex-col gap-6 p-2">
        <!-- Friendly Header -->
        <div class="text-center">
          <div class="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-orange-400 shadow-lg">
            <IconStory class="h-8 w-8 text-white" />
          </div>
          <h2 class="text-xl font-semibold text-surface-800 dark:text-surface-100">
            {{ $t('DigitalTwin.title') }}
          </h2>
          <p class="mt-2 text-sm text-surface-500 dark:text-surface-400">
            {{ $t('DigitalTwin.subtitle') }}
          </p>
        </div>

        <!-- Input Mode Toggle -->
        <div class="flex items-center justify-center gap-3">
          <Button
            :severity="inputMode === 'voice' ? 'success' : 'secondary'"
            :outlined="inputMode !== 'voice'"
            size="small"
            class="min-w-28"
            @click="inputMode = 'voice'"
          >
            <IconMicrophone class="mr-2 h-4 w-4" />
            {{ $t('DigitalTwin.voiceInput') }}
          </Button>
          <Button
            :severity="inputMode === 'text' ? 'success' : 'secondary'"
            :outlined="inputMode !== 'text'"
            size="small"
            class="min-w-28"
            @click="inputMode = 'text'"
          >
            <IconKeyboard class="mr-2 h-4 w-4" />
            {{ $t('DigitalTwin.textInput') }}
          </Button>
        </div>

        <!-- Voice Input -->
        <div v-if="inputMode === 'voice'" class="flex flex-col items-center gap-4">
          <p class="text-center text-sm text-surface-500 dark:text-surface-400">
            {{ $t('DigitalTwin.voiceHint') }}
          </p>
          <TranscriptionRecorder
            :show-result="false"
            :show-status="true"
            size="lg"
            @transcription-complete="handleTranscriptionComplete"
            @error="handleError"
          />
        </div>

        <!-- Text Input -->
        <div v-else class="flex flex-col gap-3">
          <Textarea
            v-model="textInput"
            :placeholder="$t('DigitalTwin.textPlaceholder')"
            rows="5"
            class="w-full"
            :disabled="isSubmitting"
          />
        </div>

        <!-- Transcription Preview (if available) -->
        <div
          v-if="transcription"
          class="rounded-xl bg-gradient-to-r from-sky-50 to-indigo-50 p-4 dark:from-sky-900/20 dark:to-indigo-900/20"
        >
          <div class="mb-2 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <IconCheck class="h-4 w-4 text-sky-500" />
              <span class="text-sm font-medium text-sky-700 dark:text-sky-400">
                {{ $t('DigitalTwin.recorded') }}
              </span>
            </div>
            <Button
              severity="secondary"
              text
              size="small"
              class="h-7 w-7 p-0"
              @click="clearTranscription"
              :title="$t('DigitalTwin.clearRecording')"
            >
              <IconClear class="h-4 w-4" />
            </Button>
          </div>
          <p class="line-clamp-4 text-sm text-surface-700 dark:text-surface-300">
            {{ transcription }}
          </p>
        </div>

        <!-- Save Options -->
        <div class="flex flex-col gap-3 rounded-lg bg-surface-50 p-4 dark:bg-surface-800">
          <div class="flex items-center gap-3">
            <Checkbox
              v-model="saveToWiki"
              inputId="saveToWiki"
              :binary="true"
              :disabled="isSubmitting"
            />
            <label
              for="saveToWiki"
              class="cursor-pointer text-sm text-surface-700 dark:text-surface-300"
            >
              <span class="font-medium">{{ $t('DigitalTwin.saveToWiki') }}</span>
              <span class="ml-1 text-surface-500 dark:text-surface-400">
                {{ $t('DigitalTwin.saveToWikiHint') }}
              </span>
            </label>
          </div>
        </div>

        <!-- Submit Button (only show when there's content) -->
        <Button
          v-if="canSubmit"
          :loading="isSubmitting"
          :disabled="isSubmitting"
          class="w-full !border-rose-400 !bg-gradient-to-r !from-rose-400 !to-orange-400 !py-3 text-base font-medium !text-white hover:!from-rose-500 hover:!to-orange-500"
          @click="handleSubmit"
        >
          <IconSend class="mr-2 h-5 w-5" />
          {{ $t('DigitalTwin.submit') }}
        </Button>

        <!-- Success Message -->
        <div
          v-if="lastSubmission"
          class="rounded-xl bg-gradient-to-r from-amber-100 to-orange-100 p-4 dark:from-amber-900/30 dark:to-orange-900/30"
        >
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500">
              <IconCheck class="h-5 w-5 text-white" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-medium text-amber-800 dark:text-amber-300">
                {{ $t('DigitalTwin.thankYou') }}
              </p>
              <p class="mt-1 text-sm text-amber-700 dark:text-amber-400">
                {{ $t('DigitalTwin.memorySaved') }}
              </p>
              <div
                v-if="lastSubmission.processedFacts && lastSubmission.processedFacts > 0"
                class="mt-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-500"
              >
                <IconBrain class="h-4 w-4" />
                <span>{{ $t('DigitalTwin.factsExtracted', { facts: lastSubmission.processedFacts }) }}</span>
              </div>
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
import IconStory from '~icons/line-md/heart'
import IconMicrophone from '~icons/line-md/play'
import IconKeyboard from '~icons/line-md/text-box'
import IconSend from '~icons/line-md/arrow-right'
import IconClear from '~icons/line-md/close'
import IconCheck from '~icons/line-md/confirm'
import IconBrain from '~icons/line-md/lightbulb'

interface ProcessInterviewResponse {
  success: boolean
  processedFacts: number
  updatedCategories: string[]
  newCategories: string[]
  errors: string[]
  interviewEntryId?: string
}

const { t } = useI18n()
const userStore = useUser()
const settingsStore = useSettingsStore()
const toast = useToast()

const inputMode = ref<'voice' | 'text'>('voice')
const textInput = ref('')
const transcription = ref('')
const isSubmitting = ref(false)
const saveToWiki = ref(true)
const lastSubmission = ref<{ processedFacts?: number } | null>(null)

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

// Submit the story/memory
const handleSubmit = async () => {
  if (!canSubmit.value || !entryPointId.value) return

  isSubmitting.value = true
  lastSubmission.value = null

  try {
    // Create an interview session directly and process it
    const response = await fetcher.post<ProcessInterviewResponse>(
      `/api/v1/tenant/${userStore.state.selectedTenant}/interview-sessions/process-voice-memo`,
      {
        entryPointId: entryPointId.value,
        transcript: contentToSubmit.value,
        saveToWiki: saveToWiki.value,
      }
    )

    if (response.success) {
      lastSubmission.value = {
        processedFacts: response.processedFacts || 0,
      }

      // Clear inputs
      textInput.value = ''
      transcription.value = ''

      toast.add({
        severity: 'success',
        summary: t('DigitalTwin.success'),
        detail: t('DigitalTwin.memorySavedDetail'),
        life: 3000,
      })
    }
  } catch (error) {
    console.error('Submission error:', error)
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
    }, 15000)
  }
})
</script>
