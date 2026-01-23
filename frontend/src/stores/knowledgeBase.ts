import { defineStore } from 'pinia'
import { useUser } from '@/stores/user'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useI18n } from 'vue-i18n'
import { fetcher } from '@/utils/fetcher'
import type {
  KnowledgeEntry,
  KnowledgeEntryWithText,
  KnowledgeFilters,
} from '@/types/knowledge'

export const useKnowledgeBaseStore = defineStore('knowledgeBase', () => {
  const userStore = useUser()
  const toast = useToast()
  const confirm = useConfirm()
  const { t } = useI18n()

  // Missing ChatTemplates implementation - commenting out for now
  // const { saveChatTemplate } = ChatTemplates();

  // State Variables
  const entries = ref<KnowledgeEntry[]>([])
  const loading = ref(true)
  const selectedEntry = ref<KnowledgeEntryWithText | null>(null)
  const loadingDetails = ref(false)
  const chatbotName = ref('')
  const chatbotDescription = ref('')
  const chatbotCategory = ref('')
  const isCreateAssistant = ref(false)
  // refs for multiple selection
  const selectedEntries = ref<string[]>([])
  // Replace individual category refs with a single reactive object
  const selectedCategories = ref<Record<string, string | null>>({})
  // Dialog
  const showAddNewKnowledgeDialog = ref(false)
  const showDetailsDialog = ref(false)
  const showCreateChatbotDialog = ref(false)
  const initialDetailsTab = ref<'summary' | 'content' | 'assignments'>(
    'summary',
  )

  // Predefined filters
  const predefinedFilters = ref<KnowledgeFilters>({})

  // Save the initial filters
  const initialFilters = ref<KnowledgeFilters>({})

  // Use knowledge groups as categories
  const categories = computed<Record<string, string[]>>(() => {
    // Ensure filters are loaded
    return {}
  })

  // Create a new chatbot from selected entries
  const createChatbotFromSelected = () => {
    chatbotName.value = 'Knowledge Bot'
    chatbotDescription.value = 'Custom knowledge bot'
    showCreateChatbotDialog.value = true
  }

  // Computed property for active filters
  const hasActiveFilters = computed(() => {
    return Object.values(selectedCategories.value).some(
      (value) => value !== null,
    )
  })

  const createChatbotFromFilters = () => {
    chatbotName.value = 'Filtered Knowledge Bot'
    chatbotDescription.value = 'Custom knowledge bot based on filters'
    showCreateChatbotDialog.value = true
  }

  // Fetch all knowledge entries
  const fetchEntries = async (
    tenantId: string,
    filtersParam?: KnowledgeFilters,
    categoryFilters?: Record<string, string | null>,
  ) => {
    try {
      loading.value = true
      if (!tenantId) return

      // IMPORTANT: Only update initialFilters if explicit filters are provided
      if (filtersParam) {
        initialFilters.value = filtersParam
      }

      // Always use the current initialFilters
      const currentFilters = { ...initialFilters.value }

      // Construct query params
      const filterParams = new URLSearchParams()

      if (currentFilters.workspaceId) {
        filterParams.append('workspaceId', currentFilters.workspaceId)
      }

      if (currentFilters.teamId) {
        filterParams.append('teamId', currentFilters.teamId)
      }

      if (currentFilters.userOwned) {
        filterParams.append('userOwned', currentFilters.userOwned.toString())
      }

      // Add category filters
      Object.entries(selectedCategories.value).forEach(([category, value]) => {
        if (value) {
          filterParams.append(`filter[${category}]`, value)
        }
      })

      if (
        currentFilters.knowledgeGroupId &&
        currentFilters.knowledgeGroupId !== ''
      ) {
        filterParams.append('knowledgeGroupId', currentFilters.knowledgeGroupId)
      }

      const queryString = filterParams.toString()
      const url = `/api/v1/tenant/${tenantId}/knowledge/entries${queryString ? `?${queryString}` : ''}`

      const serverEntries = await fetcher.get<KnowledgeEntry[]>(url)

      // Filter entries based on category filters
      if (categoryFilters) {
        entries.value = serverEntries.filter((entry) => {
          return Object.entries(categoryFilters).every(([category, value]) => {
            // Skip this filter if its value is null
            if (value === null) return true
            return entry.filters?.some(
              (filter) =>
                filter.filter.category === category &&
                filter.filter.name === value,
            )
          })
        })
      } else {
        entries.value = serverEntries
      }
    } catch (error) {
      console.error('Error fetching entries:', error)
      toast.add({
        severity: 'error',
        summary: t('Knowledge.manage.errorFetchingEntries'),
        life: 3000,
      })
    } finally {
      loading.value = false
    }
  }

  // Delete knowledge entry
  const dropEntry = async (tenantId: string, id: string) => {
    confirm.require({
      message: t('Knowledge.manage.confirmDrop'),
      header: t('Knowledge.manage.confirmDeleteHeader'),
      rejectProps: {
        label: t('Common.no'),
        severity: 'secondary',
        outlined: true,
      },
      acceptProps: {
        label: t('Common.yes'),
      },
      accept: async () => {
        try {
          loading.value = true
          await fetcher.delete(
            `/api/v1/tenant/${tenantId}/knowledge/entries/${id}`,
          )
          fetchEntries(tenantId)
          toast.add({
            severity: 'success',
            summary: t('Knowledge.manage.entryDropped'),
            life: 3000,
          })
        } catch (error) {
          console.log(error)
          toast.add({
            severity: 'error',
            summary: t('Knowledge.manage.errorDroppingEntry'),
            life: 5000,
          })
        } finally {
          loading.value = false
        }
      },
    })
  }

  // Show knowledge entry details
  const showEntryDetails = async (
    tenantId: string,
    id: string,
    initialTab: 'summary' | 'content' | 'assignments' = 'summary',
  ) => {
    try {
      loadingDetails.value = true
      initialDetailsTab.value = initialTab
      showDetailsDialog.value = true
      const response = await fetcher.get<KnowledgeEntryWithText>(
        `/api/v1/tenant/${tenantId}/knowledge/entries/${id}`,
      )
      selectedEntry.value = response
      return response
    } catch (error) {
      toast.add({
        summary: t('Knowledge.manage.errorLoadingEntry'),
        severity: 'error',
        life: 5000,
      })
      throw error
    } finally {
      loadingDetails.value = false
    }
  }

  // Toggles selection state for a single entry
  const handleSelectionChange = (id: string) => {
    const index = selectedEntries.value.indexOf(id)
    if (index === -1) {
      selectedEntries.value.push(id)
    } else {
      selectedEntries.value.splice(index, 1)
    }
  }

  // Delete selected knowledge entries
  const confirmDeleteSelected = (tenantId: string) => {
    confirm.require({
      message: t('Knowledge.manage.confirmDeleteSelected'),
      header: t('Knowledge.manage.confirmDeleteHeader'),
      rejectProps: {
        label: t('Common.no'),
        severity: 'secondary',
        outlined: true,
      },
      acceptProps: {
        label: t('Common.yes'),
      },
      accept: () => deleteSelectedEntries(tenantId),
    })
  }

  const deleteSelectedEntries = async (tenantId: string) => {
    try {
      loading.value = true
      await Promise.all(
        selectedEntries.value.map((id) =>
          fetcher.delete(`/api/v1/tenant/${tenantId}/knowledge/entries/${id}`),
        ),
      )
      selectedEntries.value = []
      await fetchEntries(tenantId)
      toast.add({
        severity: 'success',
        summary: t('Knowledge.manage.deleteSelectedSuccess'),
        life: 3000,
      })
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: t('Knowledge.manage.deleteSelectedError'),
        detail: error + '',
        life: 3000,
      })
    } finally {
      loading.value = false
    }
  }

  // Save the chatbot template
  const saveChatbotTemplate = async () => {
    // DISABLED: Missing ChatTemplates dependency
    console.warn('saveChatbotTemplate is disabled due to missing dependencies')
    /*
    try {
      const tenantId = userStore.state.selectedTenant;
      const missingFields = [];
      if (!chatbotName.value.trim()) missingFields.push(t('Knowledge.manage.chatbotName'));
      if (!chatbotDescription.value.trim()) missingFields.push(t('Knowledge.manage.chatbotDescription'));
      if (!chatbotCategory.value.trim()) missingFields.push(t('Knowledge.manage.chatbotCategory'));

      if (missingFields.length > 0) {
        toast.add({ severity: 'warn', detail: `${t('Common.required')} ${missingFields.join(', ')}`, life: 3000 });
        return;
      }
      isCreateAssistant.value = true;

      const filterString = Object.entries(selectedCategories.value)
        .filter(([_, value]) => value !== null)
        .map(([category, value]) => `${category}=${value}`)
        .join(',');

      const similarToClause = selectedEntries.value.length > 0 ? `id=${selectedEntries.value.join(',')}` : `filter:${filterString}`;

      const template = {
        id: 'new',
        tenantId: tenantId,
        name: `knowledge-bot-${Date.now()}`,
        label: chatbotName.value,
        description: chatbotDescription.value,
        systemPrompt: `You are a helpful assistant that can answer questions.
You will keep friendly and professional. You will give detailed answers if possible.
Your will use the following knowledge to answer the question:
{{#similar_to ${similarToClause}}}
    
If the knowledge is not relevant or is not containing the answer, you always respond
with "I am sorry. I cannot help you with that."
    
You will always respond in the user's language.
        `.trim(),
        userPrompt: null,
        category: chatbotCategory.value,
        langCode: null,
        hidden: false,
        needsInitialCall: false,
        llmOptions: {
          model: 'gpt-4o-mini',
          temperature: 0.5,
          maxTokens: 2000,
          outputType: 'text' as const,
        },
        tools: {},
      };

      const placeholder = {
        id: `new-${Date.now()}`,
        type: 'text' as const,
        name: 'user_input',
        label: 'User Input',
        description: 'Input from user',
        hidden: false,
        promptTemplateId: 'new',
        requiredByUser: true,
        defaultValue: null,
      };

      await saveChatTemplate({
        template,
        placeholders: [placeholder],
        placeholdersToDelete: [],
      });

      showCreateChatbotDialog.value = false;
      selectedEntries.value = [];

      toast.add({ severity: 'success', summary: t('Knowledge.manage.chatbotCreated'), life: 3000 });
    } catch (error) {
      toast.add({ severity: 'error', summary: t('Knowledge.manage.chatbotError'), detail: error + '', life: 3000 });
    } finally {
      isCreateAssistant.value = false;
    }
    */
  }

  const clearFilters = (tenantId: string) => {
    selectedCategories.value = {}
    fetchEntries(tenantId)
  }

  const clearSelection = () => {
    selectedEntries.value = []
  }

  return {
    predefinedFilters,
    showAddNewKnowledgeDialog,
    showDetailsDialog,
    initialDetailsTab,
    categories,
    selectedCategories,
    selectedEntry,
    loadingDetails,
    entries,
    loading,
    showCreateChatbotDialog,
    selectedEntries,
    hasActiveFilters,
    chatbotName,
    chatbotDescription,
    chatbotCategory,
    isCreateAssistant,
    clearSelection,
    fetchEntries,
    confirmDeleteSelected,
    deleteSelectedEntries,
    createChatbotFromSelected,
    createChatbotFromFilters,
    saveChatbotTemplate,
    handleSelectionChange,
    showEntryDetails,
    dropEntry,
    clearFilters,
  }
})
