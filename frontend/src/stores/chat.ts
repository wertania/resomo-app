import { defineStore } from 'pinia'

export type Role = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: Role
  content: string
  ts: number
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const sessionId = ref<string | null>(null)

  const STORAGE_SESSION_KEY = 'aiChatSessionId'
  const STORAGE_MESSAGES_KEY = 'aiChatMessages'
  const USER_SESSION_KEY = 'userSession'
  const API_URL = import.meta.env.VITE_API_AIBOT as string | undefined

  // Load persisted state from localStorage
  if (typeof window !== 'undefined') {
    sessionId.value = localStorage.getItem(STORAGE_SESSION_KEY)
    const raw = localStorage.getItem(STORAGE_MESSAGES_KEY)
    if (raw) {
      try {
        messages.value = JSON.parse(raw)
      } catch {
        messages.value = []
      }
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(messages.value))
      if (sessionId.value) {
        localStorage.setItem(STORAGE_SESSION_KEY, sessionId.value)
      }
    } catch (e) {
      // Ignore storage errors (e.g., quota exceeded)
    }
  }

  async function sendMessage(inputText: string) {
    if (!inputText.trim() || loading.value) return
    if (!API_URL) {
      error.value = 'API URL ist nicht konfiguriert.'
      return
    }

    error.value = null
    const userText = inputText.trim()

    const userMsg: ChatMessage = {
      id: crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-u`,
      role: 'user',
      content: userText,
      ts: Date.now(),
    }
    messages.value = [...messages.value, userMsg]
    persist()

    loading.value = true
    try {
      const userSession =
        (typeof window !== 'undefined' &&
          localStorage.getItem(USER_SESSION_KEY)) ||
        ''
      const payload: Record<string, any> = { chatInput: userText, userSession }
      if (sessionId.value) payload.sessionId = sessionId.value

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-USER-SESSION-ID': userSession,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`)
      }
      const data = (await res.json()) as {
        message?: string
        sessionId?: string
      }

      const assistantText = data.message ?? ''
      if (data.sessionId) {
        sessionId.value = data.sessionId
      }

      const assistantMsg: ChatMessage = {
        id: crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-a`,
        role: 'assistant',
        content: assistantText,
        ts: Date.now(),
      }
      messages.value = [...messages.value, assistantMsg]
      persist()
    } catch (e: any) {
      error.value = e?.message ?? 'Fehler beim Senden.'
    } finally {
      loading.value = false
    }
  }

  function resetChat() {
    messages.value = []
    sessionId.value = null
    error.value = null
    try {
      localStorage.removeItem(STORAGE_SESSION_KEY)
      localStorage.removeItem(STORAGE_MESSAGES_KEY)
    } catch (e) {
      // Ignore storage errors
    }
  }

  return {
    messages: readonly(messages),
    loading: readonly(loading),
    error: readonly(error),
    sessionId: readonly(sessionId),
    sendMessage,
    resetChat,
  }
})

