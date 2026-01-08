<template>
  <div class="w-full max-w-2xl mx-auto flex flex-col gap-6 p-4">
      <div class="flex items-center justify-between">
        <button
          class="text-[#5f8353] hover:text-[#a27029] underline"
          @click="goBack"
          type="button"
        >
          Zurück
        </button>
        <span v-if="entry" class="text-sm text-gray-500 dark:text-surface-400">
          {{ new Date(entry.created_at).toLocaleString('de-DE') }}
        </span>
      </div>

      <div v-if="loading" class="text-gray-500 dark:text-surface-400">
        Loading...
      </div>
      <div v-else-if="error" class="text-red-500">
        {{ error }}
      </div>
      <div v-else-if="!entry" class="text-gray-400 dark:text-surface-500">
        No data.
      </div>
      <template v-else>
        <!-- Mini Player -->
        <div class="w-full bg-white dark:bg-surface-800 rounded-xl shadow p-3 border border-gray-100 dark:border-surface-700 flex items-center gap-4">
          <div class="flex-1">
            <div class="text-sm font-semibold text-[#5f8353] dark:text-primary-400">
              Audio
            </div>
            <div class="text-xs text-gray-500 dark:text-surface-400">
              {{ entry.session_name ?? `ID ${entry.id}` }}
            </div>
          </div>
          <audio
            ref="audioEl"
            controls
            :src="audioUrl ?? undefined"
            class="w-64"
            @play="isPlaying = true"
            @pause="isPlaying = false"
            @ended="isPlaying = false"
          >
            Your browser does not support the audio element.
          </audio>
        </div>

        <!-- Transcript -->
        <div class="flex flex-col gap-3">
          <div class="text-sm font-semibold text-[#5f8353] dark:text-primary-400">
            Transkript
          </div>
          <div
            v-if="entry.data?.transcript && entry.data.transcript.length > 0"
            class="space-y-3"
          >
            <div
              v-for="(t, i) in entry.data.transcript"
              :key="i"
              class="bg-white dark:bg-surface-800 rounded-xl shadow p-4 border border-gray-100 dark:border-surface-700"
            >
              <div class="flex items-start justify-between gap-2 mb-1">
                <div class="text-xs uppercase tracking-wide text-gray-500 dark:text-surface-400">
                  {{ t.role }}
                </div>
                <button
                  v-if="isPlaying && t.time_in_call_secs != null"
                  type="button"
                  class="flex items-center gap-1 text-[#5f8353] dark:text-primary-400 hover:text-[#a27029] text-xs"
                  :title="`Zum Zeitpunkt springen (${t.time_in_call_secs}s)`"
                  @click="seekTo(t.time_in_call_secs!)"
                >
                  <!-- Jump icon -->
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    class="w-4 h-4"
                  >
                    <path
                      d="M13.5 4.5a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0V6.31l-5.22 5.22a.75.75 0 1 1-1.06-1.06L17.44 5.25h-2.19a.75.75 0 0 1-.75-.75z"
                    />
                    <path
                      d="M6 5.25A2.25 2.25 0 0 0 3.75 7.5v9A2.25 2.25 0 0 0 6 18.75h9A2.25 2.25 0 0 0 17.25 16.5v-4.5a.75.75 0 0 0-1.5 0v4.5c0 .414-.336.75-.75.75H6a.75.75 0 0 1-.75-.75v-9c0-.414.336-.75.75-.75h4.5a.75.75 0 0 0 0-1.5H6z"
                    />
                  </svg>
                  <span>Jump</span>
                </button>
              </div>
              <div class="text-gray-800 dark:text-surface-0 whitespace-pre-wrap">
                {{ t.message }}
              </div>
            </div>
          </div>
          <div v-else class="text-gray-400 dark:text-surface-500">
            Kein Transkript vorhanden.
          </div>
        </div>
      </template>
  </div>
</template>

<script setup lang="ts">
import { useArchiveStore } from '@/stores/archive'
import { useRouter, useRoute } from 'vue-router'

interface TranscriptTurn {
  role: string
  message: string
  time_in_call_secs?: number
}

interface EntryResponseFile {
  type: string
  data: number[]
}

interface EntryResponseData {
  id: number
  created_at: string
  author: string
  data: {
    transcript?: TranscriptTurn[]
  }
  file?: EntryResponseFile | null
  session_name?: string
}

const archiveStore = useArchiveStore()
const router = useRouter()
const route = useRoute()

const loading = ref(true)
const error = ref<string | null>(null)
const entry = ref<EntryResponseData | null>(null)
const audioUrl = ref<string | null>(null)
const audioEl = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)

function getIdFromRoute(): string | null {
  const id = route.query.id
  return id ? String(id) : null
}

function decodeFileToUrl(file?: EntryResponseFile | null): string | null {
  if (!file || !file.data || !Array.isArray(file.data)) return null
  try {
    const buffer = new Uint8Array(file.data)
    const blob = new Blob([buffer], { type: 'audio/mpeg' })
    return URL.createObjectURL(blob)
  } catch (e) {
    return null
  }
}

async function fetchEntry() {
  loading.value = true
  error.value = null
  try {
    const id = getIdFromRoute()
    if (!id) {
      throw new Error('Missing id parameter')
    }
    const data = await archiveStore.fetchEntryById(id)
    entry.value = data
    audioUrl.value = decodeFileToUrl(data.file ?? null)
    // Update route meta with entry title
    route.meta.headerTitle = data.session_name || 'Archiv Entry'
  } catch (e: any) {
    error.value = e.message || 'Failed to load entry.'
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push('/mobile/archive')
}

function seekTo(seconds: number) {
  if (!audioEl.value) return
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
  try {
    audioEl.value.currentTime = safeSeconds
    audioEl.value.play()
  } catch (e) {
    // ignore play() errors (e.g., autoplay restrictions)
  }
}

watch(
  () => route.query.id,
  () => {
    fetchEntry()
  },
  { immediate: true },
)

onUnmounted(() => {
  if (audioUrl.value) URL.revokeObjectURL(audioUrl.value)
})
</script>

