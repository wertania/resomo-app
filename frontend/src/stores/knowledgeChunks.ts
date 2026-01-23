import { defineStore } from 'pinia'
import type { KnowledgeChunk } from '@/types/knowledge-chunk'
import { fetcher } from '@/utils/fetcher'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'

export const useKnowledgeChunksStore = defineStore('knowledgeChunks', () => {
  const toast = useToast()
  const { t } = useI18n()

  // State
  const loading = ref(false)

  // CRUD Operations
  const fetchKnowledgeChunk = async (tenantId: string, chunkId: string) => {
    try {
      const url = `/api/v1/tenant/${tenantId}/knowledge/chunks/${chunkId}`
      const response = await fetcher.get<KnowledgeChunk>(url)
      return response
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: t('knowledgeText.error.fetch'),
        life: 3000,
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    fetchKnowledgeChunk,
    loading,
  }
})
