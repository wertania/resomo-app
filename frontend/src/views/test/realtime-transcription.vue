<template>
  <div class="min-h-full bg-surface-50 p-6 dark:bg-surface-900">
    <div class="mx-auto max-w-4xl">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-0">
          Live Transcription
        </h1>
        <p class="mt-2 text-surface-600 dark:text-surface-400">
          Realtime audio transcription powered by Mistral Voxtral.
          Speak into your microphone and see the text appear live.
        </p>
      </div>

      <!-- Status Bar -->
      <div
        class="mb-6 flex items-center gap-3 rounded-lg border p-4"
        :class="statusClasses"
      >
        <div
          class="h-3 w-3 rounded-full"
          :class="statusDotClasses"
        />
        <span class="text-sm font-medium">{{ statusText }}</span>
      </div>

      <!-- Controls -->
      <div class="mb-6 flex flex-wrap items-center gap-4">
        <Button
          v-if="!isRecording"
          :label="hasTranscription ? 'New Recording' : 'Start Recording'"
          severity="success"
          :disabled="status === 'connecting'"
          @click="startRecording"
        >
          <template #icon>
            <IconMicrophone class="mr-2 h-5 w-5" />
          </template>
        </Button>

        <Button
          v-if="isRecording"
          label="Stop Recording"
          severity="danger"
          @click="stopRecording"
        >
          <template #icon>
            <IconStop class="mr-2 h-5 w-5" />
          </template>
        </Button>

        <Button
          v-if="hasTranscription && !isRecording"
          label="Clear"
          severity="secondary"
          variant="outlined"
          @click="clearTranscription"
        />

        <!-- Audio Level Indicator -->
        <div v-if="isRecording" class="flex items-center gap-2">
          <span class="text-xs text-surface-500 dark:text-surface-400">Level:</span>
          <div class="h-2 w-32 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
            <div
              class="h-full rounded-full bg-green-500 transition-all duration-100"
              :style="{ width: `${audioLevel}%` }"
            />
          </div>
        </div>
      </div>

      <!-- Transcription Output -->
      <div
        class="rounded-xl border border-surface-200 bg-surface-0 shadow-sm dark:border-surface-700 dark:bg-surface-800"
      >
        <!-- Transcript Header -->
        <div
          class="flex items-center justify-between border-b border-surface-200 px-6 py-3 dark:border-surface-700"
        >
          <span class="text-sm font-semibold text-surface-700 dark:text-surface-300">
            Transcript
          </span>
          <span
            v-if="detectedLanguage"
            class="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
          >
            {{ detectedLanguage }}
          </span>
        </div>

        <!-- Transcript Content -->
        <div
          ref="transcriptContainer"
          class="min-h-[300px] max-h-[500px] overflow-y-auto p-6"
        >
          <div v-if="!hasTranscription && !isRecording" class="flex h-[250px] items-center justify-center">
            <div class="text-center">
              <IconMicrophoneOff class="mx-auto mb-3 h-12 w-12 text-surface-300 dark:text-surface-600" />
              <p class="text-surface-400 dark:text-surface-500">
                Click "Start Recording" to begin live transcription
              </p>
            </div>
          </div>

          <div v-else>
            <!-- Final segments -->
            <div v-for="(segment, index) in segments" :key="index" class="mb-2">
              <span
                v-if="segment.speaker"
                class="mr-2 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary"
              >
                {{ segment.speaker }}
              </span>
              <span class="text-base leading-relaxed text-surface-900 dark:text-surface-100">
                {{ segment.text }}
              </span>
            </div>

            <!-- Current streaming text -->
            <span
              v-if="currentDelta"
              class="text-base leading-relaxed text-surface-600 dark:text-surface-400"
            >
              {{ currentDelta }}
              <span v-if="isRecording" class="inline-block w-0.5 h-5 bg-primary animate-pulse align-text-bottom" />
            </span>

            <!-- Blinking cursor when recording but no text yet -->
            <span
              v-else-if="isRecording && !hasTranscription"
              class="text-surface-400 dark:text-surface-500"
            >
              Listening...
              <span class="inline-block w-0.5 h-5 bg-primary animate-pulse align-text-bottom" />
            </span>
          </div>
        </div>

        <!-- Transcript Footer -->
        <div
          v-if="hasTranscription"
          class="border-t border-surface-200 px-6 py-3 dark:border-surface-700"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs text-surface-400 dark:text-surface-500">
              {{ segments.length }} segment{{ segments.length !== 1 ? 's' : '' }}
            </span>
            <Button
              label="Copy"
              severity="secondary"
              variant="text"
              size="small"
              @click="copyTranscript"
            />
          </div>
        </div>
      </div>

      <!-- Events Log (collapsible, for debugging) -->
      <details class="mt-6">
        <summary class="cursor-pointer text-sm font-medium text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200">
          Debug: Event Log ({{ events.length }} events)
        </summary>
        <div
          class="mt-2 max-h-[300px] overflow-y-auto rounded-lg border border-surface-200 bg-surface-0 p-4 font-mono text-xs dark:border-surface-700 dark:bg-surface-800"
        >
          <div
            v-for="(event, index) in events"
            :key="index"
            class="mb-1 text-surface-600 dark:text-surface-400"
          >
            <span class="text-surface-400 dark:text-surface-500">
              {{ event.timestamp }}
            </span>
            <span class="ml-2" :class="eventTypeColor(event.type)">
              [{{ event.type }}]
            </span>
            <span class="ml-1">{{ event.preview }}</span>
          </div>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconMicrophone from '~icons/line-md/play'
import IconMicrophoneOff from '~icons/line-md/pause'
import IconStop from '~icons/line-md/pause'

// Types
interface TranscriptSegment {
  text: string
  speaker?: string
}

interface EventLogEntry {
  timestamp: string
  type: string
  preview: string
}

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'recording' | 'error' | 'disconnected'

// State
const status = ref<ConnectionStatus>('idle')
const isRecording = ref(false)
const audioLevel = ref(0)
const segments = ref<TranscriptSegment[]>([])
const currentDelta = ref('')
const detectedLanguage = ref('')
const events = ref<EventLogEntry[]>([])
const transcriptContainer = ref<HTMLElement | null>(null)

// WebSocket & Audio
let ws: WebSocket | null = null
let audioContext: AudioContext | null = null
let mediaStream: MediaStream | null = null
let scriptProcessor: ScriptProcessorNode | null = null

// Computed
const hasTranscription = computed(() => segments.value.length > 0 || currentDelta.value.length > 0)

const statusClasses = computed(() => {
  switch (status.value) {
    case 'recording':
      return 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950'
    case 'connected':
      return 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950'
    case 'connecting':
      return 'border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950'
    case 'error':
      return 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950'
    default:
      return 'border-surface-200 bg-surface-0 dark:border-surface-700 dark:bg-surface-800'
  }
})

const statusDotClasses = computed(() => {
  switch (status.value) {
    case 'recording':
      return 'bg-green-500 animate-pulse'
    case 'connected':
      return 'bg-blue-500'
    case 'connecting':
      return 'bg-yellow-500 animate-pulse'
    case 'error':
      return 'bg-red-500'
    default:
      return 'bg-surface-300 dark:bg-surface-600'
  }
})

const statusText = computed(() => {
  switch (status.value) {
    case 'recording':
      return 'Recording & Transcribing...'
    case 'connected':
      return 'Connected to transcription service'
    case 'connecting':
      return 'Connecting to transcription service...'
    case 'error':
      return 'Connection error'
    case 'disconnected':
      return 'Disconnected'
    default:
      return 'Ready'
  }
})

// Methods
function addEvent(type: string, data?: any) {
  const now = new Date()
  const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`

  let preview = ''
  if (typeof data === 'string') {
    preview = data.length > 80 ? data.substring(0, 80) + '...' : data
  } else if (data) {
    const str = JSON.stringify(data)
    preview = str.length > 80 ? str.substring(0, 80) + '...' : str
  }

  events.value.push({ timestamp, type, preview })

  // Keep max 200 events
  if (events.value.length > 200) {
    events.value = events.value.slice(-200)
  }
}

function eventTypeColor(type: string): string {
  if (type.includes('error')) return 'text-red-500'
  if (type.includes('text') || type.includes('segment')) return 'text-green-500'
  if (type.includes('session') || type.includes('ready')) return 'text-blue-500'
  if (type.includes('done')) return 'text-purple-500'
  return 'text-surface-500'
}

function getWebSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  return `${protocol}//${host}/api/v1/ws/realtime-transcription`
}

function connectWebSocket(): Promise<void> {
  return new Promise((resolve, reject) => {
    status.value = 'connecting'
    addEvent('ws.connecting', getWebSocketUrl())

    ws = new WebSocket(getWebSocketUrl())
    ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      addEvent('ws.open', 'WebSocket connected')
      status.value = 'connected'
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        handleMistralEvent(msg)

        if (msg.type === 'ready') {
          resolve()
        }
      } catch (err) {
        addEvent('ws.parse_error', String(err))
      }
    }

    ws.onerror = (event) => {
      addEvent('ws.error', 'WebSocket error')
      status.value = 'error'
      reject(new Error('WebSocket connection failed'))
    }

    ws.onclose = (event) => {
      addEvent('ws.close', `code=${event.code} reason=${event.reason}`)
      if (isRecording.value) {
        stopRecording()
      }
      status.value = 'disconnected'
      ws = null
    }

    // Timeout after 15 seconds
    setTimeout(() => {
      if (status.value === 'connecting') {
        ws?.close()
        reject(new Error('Connection timeout'))
      }
    }, 15000)
  })
}

function handleMistralEvent(msg: any) {
  addEvent(msg.type, msg)

  switch (msg.type) {
    case 'ready':
      // Server confirmed Mistral connection is ready
      break

    case 'session.created':
      addEvent('session.created', `Session: ${msg.session?.requestId}`)
      break

    case 'transcription.language':
      if (msg.language) {
        detectedLanguage.value = msg.language
      }
      break

    case 'transcription.text.delta':
      if (msg.text) {
        currentDelta.value += msg.text
        scrollToBottom()
      }
      break

    case 'transcription.segment':
      // A segment is complete - move currentDelta to segments
      if (msg.text) {
        segments.value.push({
          text: msg.text,
          speaker: msg.speaker ?? undefined,
        })
        currentDelta.value = ''
        scrollToBottom()
      }
      break

    case 'transcription.done':
      // Move any remaining delta to segments
      if (currentDelta.value.trim()) {
        segments.value.push({ text: currentDelta.value.trim() })
        currentDelta.value = ''
      }
      break

    case 'error':
      addEvent('error', msg.error?.message ?? 'Unknown error')
      break
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (transcriptContainer.value) {
      transcriptContainer.value.scrollTop = transcriptContainer.value.scrollHeight
    }
  })
}

async function startRecording() {
  try {
    // Clear previous transcription if starting fresh
    segments.value = []
    currentDelta.value = ''
    detectedLanguage.value = ''
    events.value = []

    // Connect WebSocket first
    await connectWebSocket()

    // Request microphone access
    addEvent('audio.requesting', 'Requesting microphone access...')
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
      },
    })

    // Set up audio processing
    audioContext = new AudioContext({ sampleRate: 16000 })

    // If the AudioContext sample rate doesn't match 16kHz (browser may override),
    // we'll need to resample
    const actualSampleRate = audioContext.sampleRate
    addEvent('audio.context', `Sample rate: ${actualSampleRate}Hz`)

    const source = audioContext.createMediaStreamSource(mediaStream)
    const bufferSize = 4096
    scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1)

    // Downsampling ratio if needed
    const downsampleRatio = actualSampleRate / 16000

    scriptProcessor.onaudioprocess = (event) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return

      const inputData = event.inputBuffer.getChannelData(0)

      // Calculate audio level for visualization
      let sum = 0
      for (let i = 0; i < inputData.length; i++) {
        const val = inputData[i] ?? 0
        sum += val * val
      }
      const rms = Math.sqrt(sum / inputData.length)
      audioLevel.value = Math.min(100, Math.round(rms * 500))

      // Downsample if necessary and convert to Int16
      let samples: Float32Array
      if (downsampleRatio > 1) {
        const newLength = Math.round(inputData.length / downsampleRatio)
        samples = new Float32Array(newLength)
        for (let i = 0; i < newLength; i++) {
          samples[i] = inputData[Math.round(i * downsampleRatio)] ?? 0
        }
      } else {
        samples = inputData
      }

      // Convert Float32 to Int16 (PCM S16 LE)
      const int16 = new Int16Array(samples.length)
      for (let i = 0; i < samples.length; i++) {
        const s = Math.max(-1, Math.min(1, samples[i] ?? 0))
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
      }

      // Send binary audio data over WebSocket
      ws.send(int16.buffer)
    }

    source.connect(scriptProcessor)
    scriptProcessor.connect(audioContext.destination)

    isRecording.value = true
    status.value = 'recording'
    addEvent('audio.recording', 'Started recording')
  } catch (err) {
    addEvent('error', String(err))
    status.value = 'error'
    cleanupAudio()
    console.error('Failed to start recording:', err)
  }
}

async function stopRecording() {
  addEvent('audio.stopping', 'Stopping recording...')
  isRecording.value = false
  audioLevel.value = 0

  // Signal end of audio to Mistral
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'end' }))
  }

  cleanupAudio()

  // Wait a moment for final transcription events, then close WS
  setTimeout(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'close' }))
      ws.close(1000, 'Recording stopped')
    }
    ws = null
    status.value = segments.value.length > 0 ? 'idle' : 'disconnected'
  }, 2000)
}

function cleanupAudio() {
  if (scriptProcessor) {
    scriptProcessor.disconnect()
    scriptProcessor = null
  }
  if (audioContext) {
    audioContext.close()
    audioContext = null
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop())
    mediaStream = null
  }
}

function clearTranscription() {
  segments.value = []
  currentDelta.value = ''
  detectedLanguage.value = ''
  events.value = []
  status.value = 'idle'
}

function copyTranscript() {
  const text = segments.value.map((s) => s.text).join('\n')
  navigator.clipboard.writeText(text)
}

// Cleanup on unmount
onUnmounted(() => {
  if (isRecording.value) {
    stopRecording()
  }
  if (ws) {
    ws.close()
    ws = null
  }
  cleanupAudio()
})
</script>
