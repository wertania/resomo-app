<template>
  <div class="flex flex-col h-full w-full bg-surface-0 dark:bg-surface-900">
    <!-- Messages Area -->
    <div class="flex-1 overflow-y-auto px-4 py-6">
      <!-- Greeting when no messages -->
      <div
        v-if="!hasMessages"
        class="flex flex-col items-center justify-center h-full gap-8"
      >
        <h1
          class="text-2xl font-normal text-surface-900 dark:text-surface-0 text-center"
        >
          {{ greetingPrefix }} {{ greetingSuffix }}
        </h1>

        <!-- Input Area - Directly under greeting when no messages -->
        <div class="w-full max-w-3xl px-4">
          <form @submit="handleSubmit" class="flex items-center gap-2">
            <!-- Input Field -->
            <div class="flex-1 relative">
              <input
                v-model="input"
                :placeholder="inputPlaceholder"
                class="w-full rounded-3xl px-4 py-3 pr-12 border border-surface-300 dark:border-surface-600 bg-surface-0 dark:bg-surface-800 text-surface-900 dark:text-surface-0 placeholder-surface-400 dark:placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-all"
                :disabled="isStreaming"
                @keydown.enter.exact.prevent="handleSubmit"
              />
              <!-- Microphone Icon (muted/inactive) -->
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-400 transition-colors"
                @click="handleVoiceInput"
              >
                <IconMicrophoneOff class="w-5 h-5" />
              </button>
            </div>

            <!-- Send Button (Purple) - Round -->
            <button
              type="submit"
              :disabled="!input.trim() || isStreaming"
              class="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-purple-600 hover:bg-purple-700 disabled:bg-surface-300 disabled:dark:bg-surface-700 disabled:cursor-not-allowed text-white transition-colors shadow-sm"
            >
              <IconSend class="w-6 h-6" />
            </button>
          </form>
        </div>
      </div>

      <!-- Messages List -->
      <div v-else class="max-w-3xl mx-auto space-y-6">
        <div
          v-for="(m, index) in messages"
          :key="m.id ? m.id : index"
          class="flex flex-col gap-2"
        >
          <!-- User Message -->
          <div v-if="m.role === 'user'" class="flex justify-end">
            <div
              class="max-w-[80%] rounded-2xl px-4 py-3 bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-0"
            >
              <div
                v-for="(part, partIndex) in m.parts"
                :key="`${m.id}-${part.type}-${partIndex}`"
              >
                <div v-if="part.type === 'text'" class="whitespace-pre-wrap">
                  {{ part.text }}
                </div>
              </div>
            </div>
          </div>

          <!-- AI Message -->
          <div v-else class="flex justify-start">
            <div
              class="max-w-[80%] rounded-2xl px-4 py-3 bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-surface-0"
            >
              <div
                v-for="(part, partIndex) in m.parts"
                :key="`${m.id}-${part.type}-${partIndex}`"
              >
                <div v-if="part.type === 'text'" class="whitespace-pre-wrap">
                  {{ part.text }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading indicator -->
        <div v-if="isStreaming" class="flex justify-start">
          <div class="rounded-2xl px-4 py-3 bg-surface-100 dark:bg-surface-800">
            <div class="flex gap-1">
              <div
                class="w-2 h-2 rounded-full bg-surface-400 dark:bg-surface-500 animate-bounce"
                style="animation-delay: 0ms"
              ></div>
              <div
                class="w-2 h-2 rounded-full bg-surface-400 dark:bg-surface-500 animate-bounce"
                style="animation-delay: 150ms"
              ></div>
              <div
                class="w-2 h-2 rounded-full bg-surface-400 dark:bg-surface-500 animate-bounce"
                style="animation-delay: 300ms"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Input Area - Fixed at bottom (only when messages exist) -->
    <div
      v-if="hasMessages"
      class="border-t border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900"
    >
      <div class="max-w-3xl mx-auto px-4 py-4">
        <form @submit="handleSubmit" class="flex items-center gap-2">
          <!-- Input Field -->
          <div class="flex-1 relative">
            <input
              v-model="input"
              :placeholder="inputPlaceholder"
              class="w-full rounded-3xl px-4 py-3 pr-12 border border-surface-300 dark:border-surface-600 bg-surface-0 dark:bg-surface-800 text-surface-900 dark:text-surface-0 placeholder-surface-400 dark:placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-all"
              :disabled="isStreaming"
              @keydown.enter.exact.prevent="handleSubmit"
            />
            <!-- Microphone Icon (muted/inactive) -->
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-400 transition-colors"
              @click="handleVoiceInput"
            >
              <IconMicrophoneOff class="w-5 h-5" />
            </button>
          </div>

          <!-- Send Button (Purple) - Round -->
          <button
            type="submit"
            :disabled="!input.trim() || isStreaming"
            class="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-purple-600 hover:bg-purple-700 disabled:bg-surface-300 disabled:dark:bg-surface-700 disabled:cursor-not-allowed text-white transition-colors shadow-sm"
          >
            <IconSend class="w-6 h-6" />
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Chat } from '@ai-sdk/vue'
import { DefaultChatTransport } from 'ai'
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import IconMicrophoneOff from '~icons/mdi/microphone-off'
import IconSend from '~icons/mdi/send'
import { useApp } from '@/stores/main'

const route = useRoute()
const { t } = useI18n()
const app = useApp()
const input = ref('')

const tenantId = computed(() => route.params.tenantId as string)

const chatApiUrl = computed(() => {
  return `/api/v1/tenant/${tenantId.value}/chat`
})

const chat = ref<any>(null)

const initializeChat = () => {
  if (tenantId.value) {
    chat.value = new Chat({
      transport: new DefaultChatTransport({ api: chatApiUrl.value }),
    }) as any
  }
}

// Initialize chat when tenantId is available
watch(
  tenantId,
  () => {
    initializeChat()
  },
  { immediate: true },
)

// Get messages from chat state
const messages = computed(() => {
  return chat.value?.state?.messagesRef || []
})

// Check if there are any messages
const hasMessages = computed(() => {
  return messages.value.length > 0
})

// Check if chat is streaming
const isStreaming = computed(() => {
  return chat.value?.state?.statusRef === 'streaming'
})

// Get display name for greeting
const displayName = computed(() => {
  if (app.state.loading || !app.state.user) {
    return 'User'
  }

  const user = app.state.user
  if (user.firstname && user.surname) {
    return `${user.firstname} ${user.surname}`
  }
  if (user.firstname) {
    return user.firstname
  }
  if (user.surname) {
    return user.surname
  }
  return user.email?.split('@')[0] || 'User'
})

// Greeting prefix with name
const greetingPrefix = computed(() => {
  const name = displayName.value
  return t('Chat.greetingPrefix', { name })
})

// Greeting suffix
const greetingSuffix = computed(() => {
  return t('Chat.greetingSuffix')
})

// Input placeholder based on whether messages exist
const inputPlaceholder = computed(() => {
  return hasMessages.value
    ? t('Chat.inputPlaceholderWithMessages')
    : t('Chat.inputPlaceholder')
})

const handleSubmit = (e: Event) => {
  e.preventDefault()
  if (chat.value && input.value.trim()) {
    chat.value.sendMessage({ text: input.value.trim() })
    input.value = ''
  }
}

const handleVoiceInput = () => {
  // Placeholder for voice input functionality
  console.log('Voice input clicked')
}

// Wait for app initialization
onMounted(async () => {
  await app.waitForInit()
})
</script>

<style scoped>
@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

.animate-bounce {
  animation: bounce 1s infinite;
}
</style>
