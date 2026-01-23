import { defineStore } from 'pinia'
import { useApp } from '@/stores/main'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useI18n } from 'vue-i18n'
import { fetcher } from '@/utils/fetcher'

export interface KnowledgeText {
  id: string
  tenantId: string
  tenantWide: boolean
  teamId: string | null
  userId: string | null
  parentId: string | null // Wiki hierarchy - references parent's id
  text?: string // Optional, only loaded when fetching single entry
  title: string
  meta: Record<string, any>
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
  const personalTreeData = ref<KnowledgeText[]>([])
  const companyTreeData = ref<KnowledgeText[]>([])

  // Build tree structure from flat array with alphabetical sorting
  const buildTree = (flatTexts: KnowledgeText[]): KnowledgeText[] => {
    const mapById = new Map<string, KnowledgeText>()
    const roots: KnowledgeText[] = []

    // First pass: create map by id
    flatTexts.forEach((text) => {
      const node = { ...text, children: [] }
      mapById.set(text.id, node)
    })

    // Second pass: build tree
    // parentId now contains the id of the parent (not documentId!)
    flatTexts.forEach((text) => {
      const node = mapById.get(text.id)!
      if (text.parentId && mapById.has(text.parentId)) {
        const parent = mapById.get(text.parentId)!
        if (!parent.children) parent.children = []
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    })

    // Sort function for alphabetical ordering (case-insensitive)
    const sortAlphabetically = (nodes: KnowledgeText[]): KnowledgeText[] => {
      return nodes.sort((a, b) => 
        a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
      )
    }

    // Recursively sort all children
    const sortTreeRecursively = (nodes: KnowledgeText[]): KnowledgeText[] => {
      const sorted = sortAlphabetically(nodes)
      sorted.forEach((node) => {
        if (node.children && node.children.length > 0) {
          node.children = sortTreeRecursively(node.children)
        }
      })
      return sorted
    }

    return sortTreeRecursively(roots)
  }

  // Fetch all knowledge texts
  const fetchTexts = async (tenantId: string) => {
    try {
      loading.value = true
      if (!tenantId) return

      const url = `/api/v1/tenant/${tenantId}/knowledge/texts`
      const serverTexts = await fetcher.get<KnowledgeText[]>(url)

      texts.value = serverTexts
      
      // Split texts into personal and company
      const personalTexts = serverTexts.filter(t => !t.tenantWide)
      const companyTexts = serverTexts.filter(t => t.tenantWide)
      
      personalTreeData.value = buildTree(personalTexts)
      companyTreeData.value = buildTree(companyTexts)
      
      // Keep old treeData for backwards compatibility
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
    tenantWide: boolean = true,
    userId?: string | null,
  ): Promise<KnowledgeText | null> => {
    try {
      loading.value = true
      const url = `/api/v1/tenant/${tenantId}/knowledge/texts`
      const newText = await fetcher.post<KnowledgeText>(url, {
        tenantId,
        ...data,
        tenantWide: tenantWide,
        userId: tenantWide ? null : userId,
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
      
      // Get the current text to preserve tenantWide and userId
      const currentText = texts.value.find(t => t.id === id)
      
      const updatedText = await fetcher.put<KnowledgeText>(url, {
        tenantId,
        ...data,
        tenantWide: currentText?.tenantWide ?? true,
        userId: currentText?.userId ?? null,
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

  // Move text to a new parent (or to root if newParentId is null)
  const moveText = async (
    tenantId: string,
    id: string,
    newParentId: string | null,
    targetTenantWide: boolean,
    targetUserId?: string | null,
  ): Promise<KnowledgeText | null> => {
    try {
      loading.value = true
      const url = `/api/v1/tenant/${tenantId}/knowledge/texts/${id}`
      
      // Get the current text
      const currentText = texts.value.find(t => t.id === id)
      
      // If moving to a parent, verify the parent's tenantWide matches targetTenantWide
      if (newParentId) {
        const newParent = texts.value.find(t => t.id === newParentId)
        if (newParent && newParent.tenantWide !== targetTenantWide) {
          toast.add({
            severity: 'warn',
            summary: t('Wiki.moveFailed') || 'Move failed',
            detail: t('Wiki.cannotMoveBetweenTypes') || 'Cannot move between personal and company knowledge',
            life: 3000,
          })
          return null
        }
      }
      
      // Update tenantWide based on target tree, and userId accordingly
      // If moving to tenant-wide (company), userId should be null
      // If moving to personal, use targetUserId (current user) if provided, otherwise preserve existing userId
      const finalUserId = targetTenantWide 
        ? null 
        : (targetUserId ?? currentText?.userId ?? null)
      
      const updatedText = await fetcher.put<KnowledgeText>(url, {
        tenantId,
        parentId: newParentId,
        tenantWide: targetTenantWide,
        userId: finalUserId,
      })

      await fetchTexts(tenantId)

      toast.add({
        severity: 'success',
        summary: t('Wiki.textMoved') || 'Wiki entry moved',
        life: 3000,
      })

      return updatedText
    } catch (error) {
      console.error('Error moving text:', error)
      toast.add({
        severity: 'error',
        summary: t('Wiki.errorMovingText') || 'Error moving wiki entry',
        detail: error + '',
        life: 3000,
      })
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    texts,
    loading,
    loadingText,
    selectedText,
    treeData,
    personalTreeData,
    companyTreeData,
    fetchTexts,
    fetchTextById,
    createText,
    updateText,
    deleteText,
    selectText,
    findTextById,
    moveText,
  }
})

