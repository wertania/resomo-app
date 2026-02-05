/**
 * Composable for audio transcription functionality
 * Handles recording, transcription, and state management
 */

import { ref } from 'vue'
import { fetcher } from '@/utils/fetcher'
import { useUser } from '@/stores/user'
import { useI18n } from 'vue-i18n'

export interface TranscriptionOptions {
  onTranscriptionComplete?: (text: string) => void
  onError?: (error: string) => void
}

export function useTranscription(options: TranscriptionOptions = {}) {
  const { t } = useI18n()
  const userStore = useUser()

  const isRecording = ref(false)
  const isTranscribing = ref(false)
  const transcription = ref('')
  const error = ref('')

  let mediaRecorder: MediaRecorder | null = null
  let audioChunks: Blob[] = []

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
      const errorMessage = t('Transcription.microphoneError')
      error.value = errorMessage
      if (options.onError) {
        options.onError(errorMessage)
      }
      console.error('Failed to start recording:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
      isRecording.value = false
    }
  }

  const toggleRecording = async () => {
    if (isRecording.value) {
      stopRecording()
    } else {
      await startRecording()
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
      }>(`/api/v1/tenant/${userStore.state.selectedTenant}/transcription`, formData)

      if (response.success) {
        transcription.value = response.text
        if (options.onTranscriptionComplete) {
          options.onTranscriptionComplete(response.text)
        }
      }
    } catch (err) {
      const errorMessage = t('Transcription.transcriptionError')
      error.value = errorMessage
      if (options.onError) {
        options.onError(errorMessage)
      }
      console.error('Transcription failed:', err)
    } finally {
      isTranscribing.value = false
    }
  }

  const clearTranscription = () => {
    transcription.value = ''
    error.value = ''
  }

  return {
    isRecording,
    isTranscribing,
    transcription,
    error,
    startRecording,
    stopRecording,
    toggleRecording,
    clearTranscription,
  }
}
