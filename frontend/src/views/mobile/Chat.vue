<template>
  <div class="flex flex-col h-full">
      <!-- Messages area -->
      <div class="flex-1 px-4 py-4 pb-24">
        <div v-if="chatStore.messages.length === 0" class="mt-8 text-center text-[#6b7280] dark:text-surface-400">
          Stelle Deine Frage.
        </div>

        <div class="space-y-4">
          <div
            v-for="m in chatStore.messages"
            :key="m.id"
            :class="[
              'flex',
              m.role === 'user' ? 'justify-end' : 'justify-start',
            ]"
          >
            <div
              :class="[
                'max-w-[80%] rounded-2xl px-4 py-3 shadow-sm',
                m.role === 'user'
                  ? 'bg-[#5f8353] text-white'
                  : 'bg-[#f0f2f5] dark:bg-surface-700 text-[#111418] dark:text-surface-0',
              ]"
            >
              <p class="whitespace-pre-wrap">{{ m.content }}</p>
              <div class="mt-1 text-xs opacity-70">
                {{ new Date(m.ts).toLocaleTimeString() }}
              </div>
            </div>
          </div>
        </div>
        <div ref="endRef"></div>
      </div>

      <div v-if="chatStore.error" class="mx-4 mb-2 rounded-md border border-red-200 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-red-700 dark:text-red-400">
        {{ chatStore.error }}
      </div>

      <!-- Input bar (sticky at bottom of scrollable area) -->
      <div class="sticky bottom-0 z-10 px-4 pb-[env(safe-area-inset-bottom,0px)]">
        <div
          class="mx-auto max-w-3xl flex items-center gap-2 rounded-2xl border border-[#e5e7eb] dark:border-surface-700 bg-white/95 dark:bg-surface-800/95 p-2 shadow-md backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-surface-800/70"
        >
          <input
            v-model="inputText"
            class="flex-1 px-3 py-2 text-[#111418] dark:text-surface-0 outline-none bg-transparent"
            type="text"
            placeholder="Nachricht eingeben..."
            @keydown="handleKeydown"
            :disabled="chatStore.loading"
          />
          <button
            class="rounded-md bg-[#5f8353] px-3 py-2 text-white hover:opacity-90 disabled:opacity-50"
            @click="handleSend"
            :disabled="chatStore.loading"
          >
            {{ chatStore.loading ? 'Senden...' : 'Abschicken' }}
          </button>
          <button
            class="rounded-md border border-[#e5e7eb] dark:border-surface-700 px-3 py-2 text-[#111418] dark:text-surface-0 hover:bg-[#f0f2f5] dark:hover:bg-surface-700 disabled:opacity-50"
            @click="handleReset"
            :disabled="chatStore.loading"
          >
            Reset
          </button>
        </div>
        <div class="h-2"></div>
      </div>
    </div>
</template>

<script setup lang="ts">
import { useChatStore } from '@/stores/chat'

const chatStore = useChatStore()
const inputText = ref('')
const endRef = ref<HTMLDivElement | null>(null)

function scrollToBottom() {
  endRef.value?.scrollIntoView({ behavior: 'smooth', block: 'end' })
}

watch(() => chatStore.messages, scrollToBottom, { deep: true })

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

async function handleSend() {
  if (!inputText.value.trim() || chatStore.loading) return
  const text = inputText.value
  inputText.value = ''
  await chatStore.sendMessage(text)
  await nextTick()
  scrollToBottom()
}

function handleReset() {
  chatStore.resetChat()
}
</script>

