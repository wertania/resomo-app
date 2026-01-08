<template>
  <div
      class="relative flex size-full min-h-screen flex-col bg-white dark:bg-surface-900 justify-start group/design-root overflow-hidden mobile-viewport"
      style="font-family: Manrope, 'Noto Sans', sans-serif;"
    >
      <!-- Main Content Area with AnimatedOwl -->
      <div class="flex-1 bg-white dark:bg-surface-900 flex flex-col overflow-hidden">
        <div class="flex-1 flex items-center justify-center">
          <AnimatedOwl
            ref="owlComponentRef"
            :auto-blinking="true"
            :blink-interval="2000"
            :mouth-animated="false"
            :size="300"
          />
        </div>

        <!-- Centered control card below the assistant -->
        <div class="px-6 pb-6 pt-2 pb-32">
          <div v-if="!recordingStore.isConnected" class="max-w-md mx-auto bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-xl shadow-md p-5">
            <h3 class="text-base font-semibold text-gray-800 dark:text-surface-0 mb-3">
              Microphone & Start
            </h3>
            <div class="space-y-3">
              <div>
                <label
                  for="microphone-select"
                  class="block text-sm font-medium text-gray-700 dark:text-surface-300 mb-1"
                >
                  Select Microphone
                </label>
                <select
                  id="microphone-select"
                  v-model="recordingStore.selectedMicrophoneId"
                  @change="onMicrophoneChange"
                  class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5f8353] focus:border-transparent bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-0"
                >
                  <option value="">Default Microphone</option>
                  <option
                    v-for="device in recordingStore.availableMicrophones"
                    :key="device.deviceId"
                    :value="device.deviceId"
                  >
                    {{ device.label || `Microphone ${device.deviceId.slice(0, 8)}...` }}
                  </option>
                </select>
              </div>

              <button
                class="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white bg-[#5f8353] hover:bg-[#4b6842] transition-colors duration-200"
                @click="handleStart"
                aria-label="Start Voice Conversation"
              >
                Start
              </button>

              <p class="text-xs text-gray-500 dark:text-surface-400">
                Recording requires HTTPS or localhost. On mobile, tap Start to
                grant mic permission.
              </p>
            </div>
          </div>
          <div v-else class="max-w-md mx-auto">
            <button
              class="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors duration-200 shadow-md"
              @click="handleStop"
              aria-label="Stop Voice Conversation"
            >
              Stop
            </button>
            <p v-if="recordingStore.speakingStatus" class="text-xs text-gray-500 dark:text-surface-400 text-center mt-2">
              Status:
              {{
                recordingStore.speakingStatus === 'speaking'
                  ? 'Assistant speaking'
                  : 'Listening...'
              }}
            </p>
          </div>
        </div>

        <!-- Error Display -->
        <div v-if="recordingStore.error" class="text-sm text-red-500 text-center mt-2">
          {{ recordingStore.error }}
        </div>
      </div>
    </div>
</template>

<script setup lang="ts">
import AnimatedOwl from '@/components/AnimatedOwl.vue'
import { useRecordingStore } from '@/stores/recording'
import { useNotificationStore } from '@/stores/notifications'

const recordingStore = useRecordingStore()
const notificationStore = useNotificationStore()
const owlComponentRef = ref<InstanceType<typeof AnimatedOwl> | null>(null)

let mouthAnimationInterval: number | null = null

function startAgentSpeakingAnimation() {
  if (mouthAnimationInterval) return

  mouthAnimationInterval = setInterval(() => {
    if (owlComponentRef.value) {
      owlComponentRef.value.toggleMouth()
    }
  }, 150) as any
}

function stopAgentSpeakingAnimation() {
  if (mouthAnimationInterval) {
    clearInterval(mouthAnimationInterval)
    mouthAnimationInterval = null
  }
}

watch(
  () => recordingStore.speakingStatus,
  (status) => {
    if (status === 'speaking') {
      startAgentSpeakingAnimation()
    } else {
      stopAgentSpeakingAnimation()
    }
  },
)

async function handleStart() {
  await recordingStore.getAvailableMicrophones()
  await recordingStore.startConversation()
}

async function handleStop() {
  await recordingStore.endConversation()
  stopAgentSpeakingAnimation()
}

function onMicrophoneChange() {
  const selectedDevice = recordingStore.availableMicrophones.find(
    (device) => device.deviceId === recordingStore.selectedMicrophoneId,
  )
  const deviceName =
    selectedDevice?.label ||
    recordingStore.selectedMicrophoneId ||
    'Default'
  console.log('Selected microphone:', deviceName)
  if (recordingStore.isConnected) {
    console.log(
      'Microphone change will take effect when conversation is restarted',
    )
  }
}

onMounted(async () => {
  await recordingStore.getAvailableMicrophones()
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    notificationStore.addNotification({
      id: `mic_${Date.now()}`,
      message: 'Mikrofonzugriff erfordert HTTPS oder localhost.',
      type: 'critical',
      timestamp: new Date(),
    })
  }
})

onUnmounted(async () => {
  await recordingStore.endConversation()
  stopAgentSpeakingAnimation()
})
</script>

<style scoped>
.group\/design-root {
  min-height: 0;
}
</style>

