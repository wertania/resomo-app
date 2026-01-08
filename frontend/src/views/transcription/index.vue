<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] gap-8 p-8">
    <!-- Record Button -->
    <button
      @click="toggleRecording"
      :disabled="isTranscribing"
      class="relative w-32 h-32 rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-offset-2"
      :class="[
        isRecording
          ? 'bg-red-500 hover:bg-red-600 focus:ring-red-400 animate-pulse'
          : 'bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-400',
        isTranscribing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      ]"
    >
      <component
        :is="isRecording ? IconStop : IconMicrophone"
        class="w-12 h-12 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      />
    </button>

    <!-- Status -->
    <div class="text-center">
      <p v-if="isRecording" class="text-lg text-red-500 font-medium">
        {{ t('Transcription.recording') }}
      </p>
      <p v-else-if="isTranscribing" class="text-lg text-amber-500 font-medium">
        {{ t('Transcription.transcribing') }}
      </p>
      <p v-else class="text-lg text-gray-500">
        {{ t('Transcription.clickToRecord') }}
      </p>
    </div>

    <!-- Transcription Result -->
    <div v-if="transcription" class="w-full max-w-2xl">
      <div class="bg-surface-100 dark:bg-surface-800 rounded-xl p-6 shadow-sm">
        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          {{ t('Transcription.result') }}
        </h3>
        <p class="text-lg leading-relaxed whitespace-pre-wrap">
          {{ transcription }}
        </p>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="text-red-500 text-center">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { fetcher } from '@/utils/fetcher'
import IconMicrophone from '~icons/fa-solid/microphone'
import IconStop from '~icons/fa-solid/stop'

const { t } = useI18n()
const { state } = useApp()

const isRecording = ref(false)
const isTranscribing = ref(false)
const transcription = ref('')
const error = ref('')

let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []

const toggleRecording = async () => {
  if (isRecording.value) {
    stopRecording()
  } else {
    await startRecording()
  }
}

const startRecording = async () => {
  try {
    error.value = ''
    transcription.value = ''
    audioChunks = []

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data)
      }
    }

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop())
      await transcribeRecording()
    }

    mediaRecorder.start()
    isRecording.value = true
  } catch (err) {
    error.value = t('Transcription.microphoneError')
    console.error('Failed to start recording:', err)
  }
}

const stopRecording = () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
    isRecording.value = false
  }
}

const transcribeRecording = async () => {
  if (audioChunks.length === 0) return

  isTranscribing.value = true

  try {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.webm')

    const response = await fetcher.postFormData<{
      success: boolean
      text: string
    }>(`/api/v1/tenant/${state.selectedTenant}/transcription`, formData)

    if (response.success) {
      transcription.value = response.text
    }
  } catch (err) {
    error.value = t('Transcription.transcriptionError')
    console.error('Transcription failed:', err)
  } finally {
    isTranscribing.value = false
  }
}
</script>
