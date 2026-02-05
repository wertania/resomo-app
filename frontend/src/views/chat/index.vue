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
                class="w-full rounded-3xl px-4 py-3 border border-surface-300 dark:border-surface-600 bg-surface-0 dark:bg-surface-800 text-surface-900 dark:text-surface-0 placeholder-surface-400 dark:placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-all"
                :disabled="isStreaming"
                @keydown.enter.exact.prevent="handleSubmit"
              />
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
          <div v-else class="flex flex-col gap-2">
            <!-- Tool calls as separate collapsible cards -->
            <template v-for="(part, partIndex) in m.parts" :key="`${m.id}-${part.type}-${partIndex}`">
              <div
                v-if="part.type === 'dynamic-tool' || part.type?.startsWith('tool-')"
                class="max-w-[80%]"
              >
                <div
                  class="rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 overflow-hidden"
                >
                  <!-- Collapsible Tool header -->
                  <button
                    type="button"
                    class="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors text-left"
                    @click="toggleToolExpanded(m.id, part.toolCallId)"
                  >
                    <IconChevron
                      class="w-4 h-4 text-surface-500 transition-transform"
                      :class="{ 'rotate-90': isToolExpanded(m.id, part.toolCallId) }"
                    />
                    <IconTool class="w-4 h-4 text-primary-500" />
                    <span class="font-medium text-sm text-surface-700 dark:text-surface-200">
                      {{
                        getToolDisplayName(
                          part.type === 'dynamic-tool'
                            ? part.toolName
                            : part.type?.replace('tool-', ''),
                        )
                      }}
                    </span>
                    <span
                      class="ml-auto text-xs px-2 py-0.5 rounded-full"
                      :class="getToolStateClass(part.state)"
                    >
                      {{ getToolStateText(part.state) }}
                    </span>
                  </button>

                  <!-- Collapsible Tool content -->
                  <div
                    v-show="isToolExpanded(m.id, part.toolCallId)"
                    class="px-3 py-2 text-sm border-t border-surface-200 dark:border-surface-700"
                  >
                    <!-- Input streaming -->
                    <div v-if="part.state === 'input-streaming'">
                      <div
                        class="text-surface-500 dark:text-surface-400 flex items-center gap-2"
                      >
                        <IconLoading class="w-4 h-4 animate-spin" />
                        <span>{{ t('Chat.toolInputStreaming') }}</span>
                      </div>
                      <pre
                        v-if="part.input"
                        class="mt-2 text-xs bg-surface-100 dark:bg-surface-900 p-2 rounded overflow-x-auto"
                        >{{ JSON.stringify(part.input, null, 2) }}</pre
                      >
                    </div>

                    <!-- Input available (tool is executing) -->
                    <div v-else-if="part.state === 'input-available'">
                      <div
                        class="text-surface-500 dark:text-surface-400 flex items-center gap-2"
                      >
                        <IconLoading class="w-4 h-4 animate-spin" />
                        <span>{{ t('Chat.toolExecuting') }}</span>
                      </div>
                      <pre
                        v-if="part.input"
                        class="mt-2 text-xs bg-surface-100 dark:bg-surface-900 p-2 rounded overflow-x-auto"
                        >{{ JSON.stringify(part.input, null, 2) }}</pre
                      >
                    </div>

                    <!-- Output available (tool completed) -->
                    <div v-else-if="part.state === 'output-available'">
                      <div
                        v-if="part.input"
                        class="mb-2 text-surface-500 dark:text-surface-400"
                      >
                        <span class="font-medium"
                          >{{ t('Chat.toolInput') }}:</span
                        >
                        <pre
                          class="mt-1 text-xs bg-surface-100 dark:bg-surface-900 p-2 rounded overflow-x-auto"
                          >{{ JSON.stringify(part.input, null, 2) }}</pre
                        >
                      </div>
                      <div class="text-surface-600 dark:text-surface-300">
                        <span class="font-medium"
                          >{{ t('Chat.toolOutput') }}:</span
                        >
                        <pre
                          class="mt-1 text-xs bg-surface-100 dark:bg-surface-900 p-2 rounded overflow-x-auto"
                          >{{ JSON.stringify(part.output, null, 2) }}</pre
                        >
                      </div>
                    </div>

                    <!-- Output error -->
                    <div v-else-if="part.state === 'output-error'">
                      <div class="text-red-500 dark:text-red-400">
                        <span class="font-medium"
                          >{{ t('Chat.toolError') }}:</span
                        >
                        {{ part.errorText || t('Chat.toolUnknownError') }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <!-- Text content as message bubble -->
            <div
              v-if="hasTextContent(m.parts)"
              class="flex justify-start"
            >
              <div
                class="max-w-[80%] rounded-2xl px-4 py-3 bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-surface-0"
              >
                <template v-for="(part, partIndex) in m.parts" :key="`${m.id}-text-${partIndex}`">
                  <div v-if="part.type === 'text'" class="whitespace-pre-wrap">
                    {{ part.text }}
                  </div>
                </template>
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
              class="w-full rounded-3xl px-4 py-3 border border-surface-300 dark:border-surface-600 bg-surface-0 dark:bg-surface-800 text-surface-900 dark:text-surface-0 placeholder-surface-400 dark:placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-all"
              :disabled="isStreaming"
              @keydown.enter.exact.prevent="handleSubmit"
            />
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
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import IconSend from '~icons/line-md/arrow-open-right'
import IconTool from '~icons/line-md/cog-loop'
import IconLoading from '~icons/line-md/loading-twotone-loop'
import IconChevron from '~icons/line-md/chevron-small-right'
import { useUser } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const userStore = useUser()
const input = ref('')

// Track expanded state for tool cards (collapsed by default)
const expandedTools = ref<Set<string>>(new Set())

// Chat persistence state
const currentChatId = ref<string | null>(null)

// Loaded messages from DB (for existing chats)
const loadedMessages = ref<any[]>([])

const tenantId = computed(() => route.params.tenantId as string)
const chatIdFromRoute = computed(() => route.params.chatId as string | undefined)

const chatApiUrl = computed(() => {
  return `/api/v1/tenant/${tenantId.value}/chat`
})

const chatsApiUrl = computed(() => {
  return `/api/v1/tenant/${tenantId.value}/chats`
})

const chat = ref<any>(null)

// Create a new chat via API and return the ID
const createNewChat = async (): Promise<string> => {
  const response = await fetch(chatsApiUrl.value, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({}),
  })
  if (!response.ok) {
    throw new Error('Failed to create chat')
  }
  const data = await response.json()
  return data.data.id
}

// Pending chat ID that was created but URL not yet updated
const pendingChatId = ref<string | null>(null)

// Custom fetch that intercepts chat requests to add chatId and prepend loaded messages
const createChatFetch = (
  getChatId: () => string | null,
  setChatId: (id: string) => void,
  getLoadedMessages: () => any[],
) => {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // Parse the body to inject chatId and prepend loaded messages
    if (init?.body) {
      try {
        const body = JSON.parse(init.body as string)
        
        // If no chatId yet, create one first
        let chatId = getChatId()
        if (!chatId) {
          chatId = await createNewChat()
          setChatId(chatId)
          // Store as pending - URL will be updated after stream completes
          pendingChatId.value = chatId
        }
        body.chatId = chatId
        
        // Prepend loaded messages to the messages array so AI has full context
        const loaded = getLoadedMessages()
        if (loaded.length > 0 && body.messages) {
          body.messages = [...loaded, ...body.messages]
        }
        
        init.body = JSON.stringify(body)
      } catch {
        // Not JSON, pass through
      }
    }

    const response = await fetch(input, {
      ...init,
      credentials: 'include',
    })

    return response
  }
}

// Update URL with chat ID (without triggering navigation/reload)
const updateUrlWithChatId = (chatId: string) => {
  router.replace({
    name: 'ChatWithId',
    params: {
      tenantId: tenantId.value,
      chatId: chatId,
    },
  })
}

const initializeChat = async (existingChatId?: string) => {
  if (!tenantId.value) return

  // Create custom fetch for this chat instance
  const chatFetch = createChatFetch(
    () => currentChatId.value,
    (id: string) => {
      currentChatId.value = id
      // Don't update URL here - wait for stream to complete
    },
    () => loadedMessages.value,
  )

  // If loading an existing chat, fetch messages first
  if (existingChatId) {
    try {
      const response = await fetch(`${chatsApiUrl.value}/${existingChatId}`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        currentChatId.value = existingChatId

        // Store loaded messages separately
        loadedMessages.value = data.data.messages || []

        // Initialize a fresh chat instance
        chat.value = new Chat({
          transport: new DefaultChatTransport({
            api: chatApiUrl.value,
            fetch: chatFetch,
          }),
        }) as any
        return
      }
    } catch (error) {
      console.error('Failed to load chat:', error)
    }
  }

  // New chat - no existing ID
  currentChatId.value = null
  loadedMessages.value = []
  chat.value = new Chat({
    transport: new DefaultChatTransport({
      api: chatApiUrl.value,
      fetch: chatFetch,
    }),
  }) as any
}

// Initialize chat when tenantId changes or chatId in route changes
watch(
  [tenantId, chatIdFromRoute],
  ([newTenantId, newChatId]) => {
    if (newTenantId) {
      initializeChat(newChatId)
    }
  },
  { immediate: true },
)

// Start a new chat (clear current)
const startNewChat = () => {
  currentChatId.value = null
  pendingChatId.value = null
  loadedMessages.value = []
  initializeChat()
  // Update URL to remove chatId - go back to base chat route
  router.push({ name: 'Chat', params: { tenantId: tenantId.value } })
}

// Get messages - combine loaded messages with current chat messages
const messages = computed(() => {
  const currentMessages = chat.value?.state?.messagesRef || []
  // If we have loaded messages and no current messages yet, show loaded
  // Once user sends a message, the current messages will include the conversation
  if (loadedMessages.value.length > 0 && currentMessages.length === 0) {
    return loadedMessages.value
  }
  // If we have both, combine them (loaded first, then new ones)
  if (loadedMessages.value.length > 0 && currentMessages.length > 0) {
    return [...loadedMessages.value, ...currentMessages]
  }
  return currentMessages
})

// Check if there are any messages
const hasMessages = computed(() => {
  return messages.value.length > 0
})

// Check if chat is streaming
const isStreaming = computed(() => {
  return chat.value?.state?.statusRef === 'streaming'
})

// Watch for stream completion to update URL with pending chat ID
watch(isStreaming, (streaming, wasStreaming) => {
  // When streaming ends and we have a pending chat ID, update the URL
  if (wasStreaming && !streaming && pendingChatId.value) {
    updateUrlWithChatId(pendingChatId.value)
    pendingChatId.value = null
  }
})

// Get display name for greeting
const displayName = computed(() => {
  if (userStore.isLoading || !userStore.currentUser) {
    return 'User'
  }

  const user = userStore.currentUser
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

const handleSubmit = async (e: Event) => {
  e.preventDefault()
  if (chat.value && input.value.trim()) {
    const messageText = input.value.trim()
    input.value = ''

    // Send message - the transport will extract chatId from the stream
    await chat.value.sendMessage({ text: messageText })
  }
}


// Helper to check if message has text content
const hasTextContent = (parts: any[]) => {
  return parts?.some((part) => part.type === 'text' && part.text?.trim())
}

// Toggle expanded state for a tool card
const toggleToolExpanded = (messageId: string, toolCallId: string) => {
  const key = `${messageId}-${toolCallId}`
  if (expandedTools.value.has(key)) {
    expandedTools.value.delete(key)
  } else {
    expandedTools.value.add(key)
  }
}

// Check if a tool card is expanded
const isToolExpanded = (messageId: string, toolCallId: string) => {
  const key = `${messageId}-${toolCallId}`
  return expandedTools.value.has(key)
}

// Helper function to get a display name for a tool
const getToolDisplayName = (toolName: string | undefined) => {
  if (!toolName) return 'Tool'

  // Convert camelCase to readable format
  const readable = toolName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim()

  return readable
}

// Helper function to get the CSS class for tool state badge
const getToolStateClass = (state: string | undefined) => {
  switch (state) {
    case 'input-streaming':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
    case 'input-available':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
    case 'output-available':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
    case 'output-error':
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
    default:
      return 'bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-400'
  }
}

// Helper function to get text for tool state
const getToolStateText = (state: string | undefined) => {
  switch (state) {
    case 'input-streaming':
      return t('Chat.toolStateStreaming')
    case 'input-available':
      return t('Chat.toolStateExecuting')
    case 'output-available':
      return t('Chat.toolStateCompleted')
    case 'output-error':
      return t('Chat.toolStateError')
    default:
      return state || 'Unknown'
  }
}

// Wait for app initialization
onMounted(async () => {
  await userStore.waitForInit()
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
