import { defineStore } from 'pinia'
import { useApp } from '@/stores/main'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useI18n } from 'vue-i18n'
import { fetcher } from '@/utils/fetcher'

export interface KnowledgeText {
  id: string
  documentId: string // All versions share this ID
  tenantId: string
  tenantWide: boolean
  teamId: string | null
  userId: string | null
  parentId: string | null // Wiki hierarchy only
  text?: string // Optional, only loaded when fetching single entry
  title: string
  meta: Record<string, any>
  version: number
  isLatest: boolean // True for current version
  hidden: boolean // True for system entries
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  children?: KnowledgeText[]
}

export interface KnowledgeTextInsert {
  tenantId: string
  text: string
  title: string
  parentId?: string | null
  teamId?: string | null
  userId?: string | null
  tenantWide?: boolean
  meta?: Record<string, any>
  hidden?: boolean
}

export interface KnowledgeTextUpdate {
  text?: string
  title?: string
  parentId?: string | null
  teamId?: string | null
  userId?: string | null
  tenantWide?: boolean
  meta?: Record<string, any>
  hidden?: boolean
}

export const useKnowledgeTextsStore = defineStore('knowledgeTexts', () => {
  const appStore = useApp()
  const toast = useToast()
  const confirm = useConfirm()
  const { t } = useI18n()

  // State Variables
  const texts = ref<KnowledgeText[]>([])
  const loading = ref(true)
  const loadingText = ref(false)
  const selectedText = ref<KnowledgeText | null>(null)
  const treeData = ref<KnowledgeText[]>([])

  // Build tree structure from flat array
  const buildTree = (flatTexts: KnowledgeText[]): KnowledgeText[] => {
    const mapById = new Map<string, KnowledgeText>()
    const mapByDocumentId = new Map<string, KnowledgeText>()
    const roots: KnowledgeText[] = []

    // First pass: create maps (by id and by documentId)
    flatTexts.forEach((text) => {
      const node = { ...text, children: [] }
      mapById.set(text.id, node)
      mapByDocumentId.set(text.documentId, node)
    })

    // Second pass: build tree
    // parentId now contains the documentId of the parent (not id!)
    flatTexts.forEach((text) => {
      const node = mapById.get(text.id)!
      if (text.parentId && mapByDocumentId.has(text.parentId)) {
        const parent = mapByDocumentId.get(text.parentId)!
        if (!parent.children) parent.children = []
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    })

    return roots
  }

  // Fetch all knowledge texts
  const fetchTexts = async (tenantId: string) => {
    try {
      loading.value = true
      if (!tenantId) return

      const url = `/api/v1/tenant/${tenantId}/knowledge/texts`
      const serverTexts = await fetcher.get<KnowledgeText[]>(url)

      texts.value = serverTexts
      treeData.value = buildTree(serverTexts)
    } catch (error) {
      console.error('Error fetching texts:', error)
      toast.add({
        severity: 'error',
        summary: t('Wiki.errorFetchingTexts') || 'Error fetching wiki entries',
        life: 3000,
      })
    } finally {
      loading.value = false
    }
  }

  // Create knowledge text
  const createText = async (
    tenantId: string,
    data: Omit<KnowledgeTextInsert, 'tenantId'>,
  ): Promise<KnowledgeText | null> => {
    try {
      loading.value = true
      const url = `/api/v1/tenant/${tenantId}/knowledge/texts`
      const newText = await fetcher.post<KnowledgeText>(url, {
        tenantId,
        ...data,
      })

      await fetchTexts(tenantId)

      toast.add({
        severity: 'success',
        summary: t('Wiki.textCreated') || 'Wiki entry created',
        life: 3000,
      })

      return newText
    } catch (error) {
      console.error('Error creating text:', error)
      toast.add({
        severity: 'error',
        summary: t('Wiki.errorCreatingText') || 'Error creating wiki entry',
        detail: error + '',
        life: 3000,
      })
      return null
    } finally {
      loading.value = false
    }
  }

  // Update knowledge text
  const updateText = async (
    tenantId: string,
    id: string,
    data: KnowledgeTextUpdate,
  ): Promise<KnowledgeText | null> => {
    try {
      loading.value = true
      const url = `/api/v1/tenant/${tenantId}/knowledge/texts/${id}`
      const updatedText = await fetcher.put<KnowledgeText>(url, {
        tenantId,
        ...data,
      })

      await fetchTexts(tenantId)

      toast.add({
        severity: 'success',
        summary: t('Wiki.textUpdated') || 'Wiki entry updated',
        life: 3000,
      })

      return updatedText
    } catch (error) {
      console.error('Error updating text:', error)
      toast.add({
        severity: 'error',
        summary: t('Wiki.errorUpdatingText') || 'Error updating wiki entry',
        detail: error + '',
        life: 3000,
      })
      return null
    } finally {
      loading.value = false
    }
  }

  // Delete knowledge text
  const deleteText = async (tenantId: string, id: string) => {
    confirm.require({
      message:
        t('Wiki.confirmDelete') || 'Are you sure you want to delete this entry?',
      header: t('Wiki.confirmDeleteHeader') || 'Confirm Delete',
      rejectProps: {
        label: t('Common.no') || 'No',
        severity: 'secondary',
        outlined: true,
      },
      acceptProps: {
        label: t('Common.yes') || 'Yes',
      },
      accept: async () => {
        try {
          loading.value = true
          await fetcher.delete(
            `/api/v1/tenant/${tenantId}/knowledge/texts/${id}`,
          )

          // Clear selection if deleted text was selected
          if (selectedText.value?.id === id) {
            selectedText.value = null
          }

          await fetchTexts(tenantId)

          toast.add({
            severity: 'success',
            summary: t('Wiki.textDeleted') || 'Wiki entry deleted',
            life: 3000,
          })
        } catch (error) {
          console.error('Error deleting text:', error)
          toast.add({
            severity: 'error',
            summary: t('Wiki.errorDeletingText') || 'Error deleting wiki entry',
            detail: error + '',
            life: 3000,
          })
        } finally {
          loading.value = false
        }
      },
    })
  }

  // Fetch single text with content
  const fetchTextById = async (
    tenantId: string,
    id: string,
  ): Promise<KnowledgeText | null> => {
    try {
      loadingText.value = true
      const url = `/api/v1/tenant/${tenantId}/knowledge/texts/${id}`
      const result = await fetcher.get<KnowledgeText>(url)
      return result
    } catch (error) {
      console.error('Error fetching text:', error)
      toast.add({
        severity: 'error',
        summary: t('Wiki.errorFetchingText') || 'Error fetching wiki entry',
        life: 3000,
      })
      return null
    } finally {
      loadingText.value = false
    }
  }

  // Select a text and load its content
  const selectText = async (id: string | null, tenantId?: string) => {
    if (!id || !tenantId) {
      selectedText.value = null
      return
    }

    // Load full text content (fetchTextById handles loadingText state)
    const fullText = await fetchTextById(tenantId, id)
    if (fullText) {
      selectedText.value = fullText
    }
  }

  // Find text by ID (without content)
  const findTextById = (id: string): KnowledgeText | null => {
    return texts.value.find((t) => t.id === id) || null
  }

  return {
    texts,
    loading,
    loadingText,
    selectedText,
    treeData,
    fetchTexts,
    fetchTextById,
    createText,
    updateText,
    deleteText,
    selectText,
    findTextById,
  }
})

