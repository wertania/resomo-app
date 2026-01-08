import { defineStore } from 'pinia'
import { fetcher } from '@/utils/fetcher'

export interface ArchiveEntry {
  id: number
  session_name: string
  created_at: string
}

export const useArchiveStore = defineStore('archive', () => {
  const entries = ref<ArchiveEntry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const API_URL = import.meta.env.VITE_API_ENTRIES as string | undefined

  async function fetchEntries() {
    if (!API_URL) {
      error.value = 'VITE_API_ENTRIES environment variable is not set'
      return
    }

    loading.value = true
    error.value = null
    try {
      const userSession =
        (typeof window !== 'undefined' && localStorage.getItem('userSession')) ||
        ''
      const res = await fetch(`${API_URL}/all`, {
        headers: { 'X-USER-SESSION-ID': userSession },
      })
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data: { data: ArchiveEntry[] } = await res.json()
      // Sort by created_at descending
      entries.value = data.data.sort(
        (a: ArchiveEntry, b: ArchiveEntry) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
    } catch (e: any) {
      error.value = e.message || 'Failed to load entries.'
    } finally {
      loading.value = false
    }
  }

  async function deleteEntry(id: number) {
    if (!API_URL) {
      error.value = 'VITE_API_ENTRIES environment variable is not set'
      return
    }
    try {
      loading.value = true
      const userSession =
        (typeof window !== 'undefined' && localStorage.getItem('userSession')) ||
        ''
      const res = await fetch(`${API_URL}?id=${id}`, {
        method: 'DELETE',
        headers: { 'X-USER-SESSION-ID': userSession },
      })
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      // Remove entry from local list
      entries.value = entries.value.filter((e) => e.id !== id)
    } catch (e: any) {
      error.value = e.message || 'Failed to delete entry.'
    } finally {
      loading.value = false
    }
  }

  async function updateEntry(id: number, session_name: string) {
    if (!API_URL) {
      error.value = 'VITE_API_ENTRIES environment variable is not set'
      return
    }
    try {
      loading.value = true
      const userSession =
        (typeof window !== 'undefined' && localStorage.getItem('userSession')) ||
        ''
      const res = await fetch(API_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-USER-SESSION-ID': userSession,
        },
        body: JSON.stringify({ id, session_name }),
      })
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      // Update local entry
      entries.value = entries.value.map((e) =>
        e.id === id ? { ...e, session_name } : e,
      )
    } catch (e: any) {
      error.value = e.message || 'Failed to update entry.'
    } finally {
      loading.value = false
    }
  }

  async function fetchEntryById(id: string) {
    const baseUrl = import.meta.env.VITE_API_ENTRIES
    if (!baseUrl) {
      throw new Error('VITE_API_ENTRIES environment variable is not set')
    }
    const userSession =
      (typeof window !== 'undefined' && localStorage.getItem('userSession')) ||
      ''
    const res = await fetch(`${baseUrl}?id=${encodeURIComponent(id)}`, {
      headers: { 'X-USER-SESSION-ID': userSession },
    })
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }
    return res.json()
  }

  return {
    entries: readonly(entries),
    loading: readonly(loading),
    error: readonly(error),
    fetchEntries,
    deleteEntry,
    updateEntry,
    fetchEntryById,
  }
})

