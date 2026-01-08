import { defineStore } from 'pinia'
// Note: @elevenlabs/client needs to be installed: npm install @elevenlabs/client
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - @elevenlabs/client may not be installed
import { Conversation } from '@elevenlabs/client'

export const useRecordingStore = defineStore('recording', () => {
  const mode = ref<'speaking' | 'waiting'>('waiting')
  const isConnected = ref<boolean>(false)
  const isSpeaking = ref<boolean>(false)
  const speakingStatus = ref<'speaking' | 'listening' | null>(null)
  const currentSpeaker = ref<'agent' | 'user' | null>(null)
  const error = ref<string | null>(null)
  const selectedMicrophoneId = ref<string>('')
  const availableMicrophones = ref<MediaDeviceInfo[]>([])
  const conversation = ref<any>(null)
  const currentStream = ref<MediaStream | null>(null)

  async function getSignedUrl() {
    const apiUrl = import.meta.env.VITE_11LABS_SIGNED_URL_API
    const agentId = import.meta.env.VITE_11LABS_AGENT_ID

    if (!apiUrl) {
      throw new Error(
        'VITE_11LABS_SIGNED_URL_API environment variable is not set',
      )
    }

    if (!agentId) {
      throw new Error('VITE_11LABS_AGENT_ID environment variable is not set')
    }

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to get signed URL: ' + response.statusText)
    }

    const body = await response.json()
    return body.signedUrl
  }

  async function getAvailableMicrophones() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      availableMicrophones.value = devices.filter(
        (device) => device.kind === 'audioinput',
      )
    } catch (err: any) {
      console.error('Error getting microphone devices:', err)
      error.value = `Fehler beim Ermitteln der Mikrofone: ${err?.message ?? 'Unbekannter Fehler'}`
    }
  }

  async function startConversation() {
    try {
      // Get microphone stream with selected device
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }

      if (selectedMicrophoneId.value) {
        audioConstraints.deviceId = { exact: selectedMicrophoneId.value }
      }

      currentStream.value = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      })

      // Log which microphone is being used
      const selectedDevice = availableMicrophones.value.find(
        (device) => device.deviceId === selectedMicrophoneId.value,
      )
      const deviceName =
        selectedDevice?.label || selectedMicrophoneId.value || 'Default'
      console.log('Using microphone:', deviceName)

      // Use the real ElevenLabs API
      const signedUrl = await getSignedUrl()
      const agentId = import.meta.env.VITE_11LABS_AGENT_ID
      const userUuid = localStorage.getItem('userSession')

      conversation.value = await Conversation.startSession({
        signedUrl: signedUrl,
        agentId: agentId,
        customLlmExtraBody: {
          user_uuid: userUuid,
        },
        onConnect: () => {
          isConnected.value = true
          speakingStatus.value = 'listening'
          mode.value = 'waiting'
          error.value = null
        },
        onDisconnect: () => {
          isConnected.value = false
          speakingStatus.value = null
          isSpeaking.value = false
          currentSpeaker.value = null
          mode.value = 'waiting'
          // Clean up the stream
          if (currentStream.value) {
            currentStream.value.getTracks().forEach((track) => track.stop())
            currentStream.value = null
          }
        },
        onError: (errorMsg: string) => {
          console.error('Conversation error:', errorMsg)
          error.value = 'Conversation error: ' + errorMsg
          isConnected.value = false
          isSpeaking.value = false
          currentSpeaker.value = null
          mode.value = 'waiting'
          // Clean up the stream
          if (currentStream.value) {
            currentStream.value.getTracks().forEach((track) => track.stop())
            currentStream.value = null
          }
        },
        onModeChange: (modeChange: { mode: 'speaking' | 'listening' }) => {
          console.log('mode', modeChange)
          speakingStatus.value = modeChange.mode
          if (modeChange.mode === 'speaking') {
            isSpeaking.value = true
            currentSpeaker.value = 'agent'
            mode.value = 'speaking'
          } else if (modeChange.mode === 'listening') {
            isSpeaking.value = true
            currentSpeaker.value = 'user'
            mode.value = 'waiting'
          } else {
            isSpeaking.value = false
            currentSpeaker.value = null
            mode.value = 'waiting'
          }
        },
      })
    } catch (err: any) {
      console.error('Error starting conversation:', err)
      error.value = `Konnte Aufnahme nicht starten: ${err?.message ?? err ?? 'Unbekannter Fehler'}`
    }
  }

  async function endConversation() {
    if (conversation.value) {
      await conversation.value.endSession()
      conversation.value = null
    }

    // Clean up the stream
    if (currentStream.value) {
      currentStream.value.getTracks().forEach((track) => track.stop())
      currentStream.value = null
    }

    // Reset all states
    isConnected.value = false
    speakingStatus.value = null
    isSpeaking.value = false
    currentSpeaker.value = null
    mode.value = 'waiting'
  }

  return {
    mode: readonly(mode),
    isConnected: readonly(isConnected),
    isSpeaking: readonly(isSpeaking),
    speakingStatus: readonly(speakingStatus),
    currentSpeaker: readonly(currentSpeaker),
    error: readonly(error),
    selectedMicrophoneId,
    availableMicrophones: readonly(availableMicrophones),
    getAvailableMicrophones,
    startConversation,
    endConversation,
  }
})

