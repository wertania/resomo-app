<template>
  <div class="flex flex-col items-center gap-4">
    <!-- Record Button -->
    <button
      @click="toggleRecording"
      :disabled="isTranscribing"
      class="relative rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-offset-2"
      :class="[
        sizeClasses,
        isRecording
          ? 'animate-pulse bg-red-500 hover:bg-red-600 focus:ring-red-400'
          : 'bg-gradient-to-br from-rose-400 to-orange-400 hover:from-rose-500 hover:to-orange-500 focus:ring-rose-400',
        isTranscribing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      ]"
    >
      <component
        :is="isRecording ? IconStop : IconMicrophone"
        class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white"
        :class="iconSizeClasses"
      />
    </button>

    <!-- Status -->
    <div v-if="showStatus" class="text-center">
      <p v-if="isRecording" class="text-sm font-medium text-red-500">
        {{ $t('Transcription.recording') }}
      </p>
      <p v-else-if="isTranscribing" class="text-sm font-medium text-amber-500">
        {{ $t('Transcription.transcribing') }}
      </p>
      <p v-else class="text-sm text-gray-500">
        {{ $t('Transcription.clickToRecord') }}
      </p>
    </div>

    <!-- Transcription Result (Optional - only shown if showResult is true) -->
    <div v-if="showResult && transcription" class="w-full">
      <div class="rounded-xl bg-surface-100 p-4 shadow-sm dark:bg-surface-800">
        <h3 class="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
          {{ $t('Transcription.result') }}
        </h3>
        <p class="whitespace-pre-wrap text-base leading-relaxed">
          {{ transcription }}
        </p>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="text-center text-sm text-red-500">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTranscription } from '@/composables/useTranscription'
import IconMicrophone from '~icons/line-md/play'
import IconStop from '~icons/line-md/pause'

interface Props {
  showResult?: boolean
  showStatus?: boolean
  size?: 'sm' | 'md' | 'lg'
}

interface Emits {
  (e: 'transcription-complete', text: string): void
  (e: 'error', error: string): void
  (e: 'recording-start'): void
  (e: 'recording-stop'): void
}

const props = withDefaults(defineProps<Props>(), {
  showResult: true,
  showStatus: true,
  size: 'lg',
})

const emit = defineEmits<Emits>()

// Size classes based on prop
const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'h-12 w-12'
    case 'md':
      return 'h-20 w-20'
    case 'lg':
    default:
      return 'h-32 w-32'
  }
})

const iconSizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'h-5 w-5'
    case 'md':
      return 'h-8 w-8'
    case 'lg':
    default:
      return 'h-12 w-12'
  }
})

const {
  isRecording,
  isTranscribing,
  transcription,
  error,
  toggleRecording: baseToggleRecording,
} = useTranscription({
  onTranscriptionComplete: (text) => {
    emit('transcription-complete', text)
  },
  onError: (error) => {
    emit('error', error)
  },
})

// Wrap toggle to emit events
const toggleRecording = async () => {
  if (isRecording.value) {
    emit('recording-stop')
  } else {
    emit('recording-start')
  }
  await baseToggleRecording()
}
</script>
