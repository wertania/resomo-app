<template>
  <div class="flex h-full bg-surface-50 dark:bg-surface-900">
    <!-- Left Sidebar: Tree View -->
    <div
      class="flex w-80 flex-col border-r border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800"
    >
      <!-- Header -->
      <div
        class="flex h-16 items-center justify-between border-b border-surface-200 px-4 dark:border-surface-700"
      >
        <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-0">
          {{ $t('Wiki.title') || 'Wiki' }}
        </h2>
      </div>

      <!-- Tree Container -->
      <div class="flex-1 overflow-y-auto p-3">
        <!-- Personal Knowledge Section -->
        <div class="mb-6">
          <div class="mb-2 flex items-center justify-between">
            <div class="flex items-center gap-2 text-sm font-semibold text-surface-700 dark:text-surface-300">
              <IconUser class="h-4 w-4" />
              <span>{{ $t('Wiki.personal') || 'Persönlich' }}</span>
            </div>
            <Button
              severity="success"
              size="small"
              text
              class="h-8 w-8"
              @click="handleAddRoot(false)"
              :disabled="!tenantId"
              :title="$t('Wiki.addPersonalEntry') || 'Add personal entry'"
            >
              <IconAdd class="h-4 w-4" />
            </Button>
          </div>
          <WikiTree
            :items="store.personalTreeData"
            :selected-id="store.selectedText?.id || null"
            :is-tenant-wide="false"
            @select="handleSelectText"
            @add-child="(id) => handleAddChild(id, false)"
            @edit="handleEdit"
            @delete="handleDelete"
            @move="handleMove"
          />
        </div>

        <!-- Company Knowledge Section -->
        <div>
          <div class="mb-2 flex items-center justify-between">
            <div class="flex items-center gap-2 text-sm font-semibold text-surface-700 dark:text-surface-300">
              <IconCompany class="h-4 w-4" />
              <span>{{ $t('Wiki.company') || 'Unternehmen' }}</span>
            </div>
            <Button
              severity="success"
              size="small"
              text
              class="h-8 w-8"
              @click="handleAddRoot(true)"
              :disabled="!tenantId"
              :title="$t('Wiki.addCompanyEntry') || 'Add company entry'"
            >
              <IconAdd class="h-4 w-4" />
            </Button>
          </div>
          <WikiTree
            :items="store.companyTreeData"
            :selected-id="store.selectedText?.id || null"
            :is-tenant-wide="true"
            @select="handleSelectText"
            @add-child="(id) => handleAddChild(id, true)"
            @edit="handleEdit"
            @delete="handleDelete"
            @move="handleMove"
          />
        </div>
      </div>
    </div>

    <!-- Right Side: Editor -->
    <div class="flex flex-1 flex-col">
      <!-- Editor Header -->
      <div
        v-if="store.selectedText"
        class="flex h-16 items-center justify-between border-b border-surface-200 bg-white px-6 dark:border-surface-700 dark:bg-surface-800"
      >
        <div class="flex-1 min-w-0 mr-4">
          <input
            v-model="editTitle"
            type="text"
            class="w-full border-none bg-transparent text-2xl font-semibold text-surface-900 outline-none dark:text-surface-0"
            :placeholder="$t('Wiki.titlePlaceholder') || 'Enter title...'"
            @blur="handleSaveTitle"
          />
        </div>
        <div class="flex items-center gap-2">
          <!-- Apply to Digital Twin Button (only for protocol entries) -->
          <Button
            v-if="isProtocolEntry && settingsStore.getDigitalTwinEntryPoint()"
            severity="help"
            size="small"
            outlined
            class="h-9"
            @click="handleApplyToDigitalTwin"
            :disabled="store.loading || isProcessingProtocol"
            :loading="isProcessingProtocol"
            :title="$t('Wiki.applyToDigitalTwin') || 'Apply to Digital Twin'"
          >
            <IconBrain class="h-4 w-4 mr-1" />
            <span class="text-xs">{{ $t('Wiki.applyToDigitalTwin') || 'Apply to Digital Twin' }}</span>
          </Button>
          <Button
            v-if="isPersonalEntry"
            :severity="isDigitalTwinEntry ? 'success' : 'warning'"
            size="small"
            :outlined="!isDigitalTwinEntry"
            class="h-9 w-9"
            @click="handleSetDigitalTwin"
            :disabled="store.loading || !store.selectedText"
            :title="isDigitalTwinEntry ? ($t('Wiki.removeDigitalTwin') || 'Remove Digital Twin') : ($t('Wiki.setDigitalTwin') || 'Set as Digital Twin')"
          >
            <IconDigitalTwin class="h-4 w-4" />
          </Button>
          <Button
            severity="info"
            size="small"
            outlined
            class="h-9 w-9"
            @click="handleCopyWikiLink"
            :disabled="store.loading || !store.selectedText"
            :title="$t('Wiki.copyLink') || 'Copy Wiki Link'"
          >
            <IconLink class="h-4 w-4" />
          </Button>
          <Button
            severity="success"
            size="small"
            outlined
            class="h-9 w-9"
            @click="handleSmartEdit"
            :disabled="store.loading || !store.selectedText"
            :title="$t('Wiki.smartEdit') || 'Smart Edit'"
          >
            <IconMagic class="h-4 w-4" />
          </Button>
          <Button
            severity="danger"
            size="small"
            outlined
            class="h-9 w-9"
            @click="handleDeleteCurrent"
            :disabled="store.loading"
            :title="$t('Wiki.delete') || 'Delete'"
          >
            <IconDelete class="h-4 w-4" />
          </Button>
          <Button
            severity="secondary"
            size="small"
            outlined
            class="h-9 w-9"
            @click="handleSave"
            :disabled="store.loading"
            :title="$t('Common.save') || 'Save'"
          >
            <IconSave class="h-4 w-4" />
          </Button>
        </div>
      </div>

      <!-- Editor Content -->
      <div class="flex-1 overflow-y-auto bg-white dark:bg-surface-800">
        <!-- Loading State -->
        <div
          v-if="store.loadingText"
          class="flex h-full items-center justify-center text-surface-500 dark:text-surface-400"
        >
          <div class="text-center">
            <ProgressSpinner
              style="width: 50px; height: 50px"
              strokeWidth="4"
              animationDuration="1s"
            />
            <p class="mt-4 text-lg">
              {{ $t('Wiki.loadingContent') || 'Loading...' }}
            </p>
          </div>
        </div>
        <!-- Editor -->
        <div v-else-if="store.selectedText" class="h-full p-6">
          <MarkdownEditor
            v-model="editText"
            :placeholder="$t('Wiki.contentPlaceholder') || 'Start writing...'"
            height="100%"
          />
        </div>
        <!-- Empty State -->
        <div
          v-else
          class="flex h-full items-center justify-center text-surface-500 dark:text-surface-400"
        >
          <div class="text-center">
            <IconDocument class="mx-auto mb-4 h-16 w-16 opacity-50" />
            <p class="text-lg">
              {{ $t('Wiki.selectEntry') || 'Select an entry to view or edit' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Smart Edit Dialog -->
    <SmartEditDialog
      v-model:visible="showSmartEditDialog"
      :entry-id="store.selectedText?.id || null"
      @changes-applied="handleChangesApplied"
    />
  </div>
</template>

<script setup lang="ts">
import { useKnowledgeTextsStore } from '@/stores/knowledgeTexts'
import { useUser } from '@/stores/user'
import WikiTree from '@/components/wiki/WikiTree.vue'
import MarkdownEditor from '@/components/knowledge/MarkdownEditor.vue'
import SmartEditDialog from '@/components/wiki/SmartEditDialog.vue'
import { fetcher } from '@/utils/fetcher'
import IconAdd from '~icons/line-md/plus'
import IconSave from '~icons/line-md/clipboard-check'
import IconDocument from '~icons/line-md/file-document'
import IconDelete from '~icons/line-md/trash'
import IconLink from '~icons/line-md/link'
import IconMagic from '~icons/line-md/edit'
import IconUser from '~icons/line-md/account'
import IconCompany from '~icons/line-md/home'
import IconDigitalTwin from '~icons/line-md/star'
import IconBrain from '~icons/line-md/lightbulb'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores/settings'

const store = useKnowledgeTextsStore()
const userStore = useUser()
const settingsStore = useSettingsStore()
const toast = useToast()
const { t } = useI18n()

const tenantId = computed(() => userStore.state.selectedTenant)
const userId = computed(() => userStore.state.user?.id || null)
const editTitle = ref('')
const editText = ref('')
const showSmartEditDialog = ref(false)

// Check if current entry is personal (not tenant-wide)
const isPersonalEntry = computed(() => {
  return store.selectedText && !store.selectedText.tenantWide
})

// Check if current entry is set as digital twin
const isDigitalTwinEntry = computed(() => {
  if (!store.selectedText) return false
  return settingsStore.getDigitalTwinEntryPoint() === store.selectedText.id
})

// Check if current entry is a protocol (based on title pattern)
// Pattern: yyyy-mm-dd_hh-mm_protocol
const isProtocolEntry = computed(() => {
  if (!store.selectedText) return false
  const protocolPattern = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}_protocol$/
  return protocolPattern.test(store.selectedText.title)
})

// Processing state for apply to digital twin
const isProcessingProtocol = ref(false)

// Watch for tenant change
watch(
  tenantId,
  async (newTenantId) => {
    if (newTenantId) {
      await store.fetchTexts(newTenantId)
      // Load user settings when tenant changes
      await settingsStore.loadUserSettings()
    }
  },
  { immediate: true },
)

// Watch for selected text changes
watch(
  () => store.selectedText,
  (newText) => {
    if (newText) {
      editTitle.value = newText.title
      // Only set editText if text content is available (not undefined from list view)
      if (newText.text !== undefined) {
        editText.value = newText.text
      }
    } else {
      editTitle.value = ''
      editText.value = ''
    }
  },
  { immediate: true },
)

// Handle add root entry (or child if an entry is selected)
const handleAddRoot = async (isTenantWide: boolean = true) => {
  if (!tenantId.value) return

  // If an entry is selected, create a child under it
  if (store.selectedText) {
    return handleAddChild(store.selectedText.id, isTenantWide)
  }

  // Otherwise create a root entry
  const newText = await store.createText(
    tenantId.value, 
    {
      title: 'New Entry',
      text: '',
      parentId: null,
    },
    isTenantWide,
    userId.value,
  )

  if (newText) {
    await store.selectText(newText.id, tenantId.value)
  }
}

// Handle add child entry
const handleAddChild = async (parentId: string, isTenantWide: boolean = true) => {
  if (!tenantId.value) return

  const newText = await store.createText(
    tenantId.value,
    {
      title: 'New Entry',
      text: '',
      parentId,
    },
    isTenantWide,
    userId.value,
  )

  if (newText) {
    await store.selectText(newText.id, tenantId.value)
  }
}

// Handle select text
const handleSelectText = async (id: string) => {
  if (!tenantId.value) return
  await store.selectText(id, tenantId.value)
}

// Handle edit (same as select for now)
const handleEdit = (id: string) => {
  handleSelectText(id)
}

// Handle delete
const handleDelete = async (id: string) => {
  if (!tenantId.value) return
  await store.deleteText(tenantId.value, id)
}

// Handle delete current entry
const handleDeleteCurrent = async () => {
  if (!tenantId.value || !store.selectedText) return
  await store.deleteText(tenantId.value, store.selectedText.id)
}

// Handle save title
const handleSaveTitle = async () => {
  if (!tenantId.value || !store.selectedText) return

  if (editTitle.value !== store.selectedText.title) {
    await store.updateText(tenantId.value, store.selectedText.id, {
      title: editTitle.value,
    })
  }
}

// Handle save content
const handleSave = async () => {
  if (!tenantId.value || !store.selectedText) return

  await store.updateText(tenantId.value, store.selectedText.id, {
    title: editTitle.value,
    text: editText.value,
  })
}

// Handle move entry via drag & drop
const handleMove = (data: { itemId: string; newParentId: string | null; targetTenantWide: boolean }) => {
  if (!tenantId.value) return
  // When moving to personal, use current userId if entry doesn't have one
  if (data.targetTenantWide) {
    // Moving to company - userId should be null
    store.moveText(tenantId.value, data.itemId, data.newParentId, data.targetTenantWide, null)
  } else {
    // Moving to personal - use current userId
    store.moveText(tenantId.value, data.itemId, data.newParentId, data.targetTenantWide, userId.value ?? undefined)
  }
}

// Handle copy wiki link
const handleCopyWikiLink = async () => {
  if (!tenantId.value || !store.selectedText) return

  const baseUrl = window.location.origin
  const wikiLink = `${baseUrl}/api/v1/tenant/${tenantId.value}/knowledge-wiki/${store.selectedText.id}?type=json`

  try {
    await navigator.clipboard.writeText(wikiLink)
    toast.add({
      severity: 'success',
      summary: t('Wiki.linkCopied') || 'Link copied',
      detail: t('Wiki.linkCopiedDetail') || 'Wiki link copied to clipboard',
      life: 3000,
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: t('Wiki.linkCopyError') || 'Error copying link',
      detail: t('Wiki.linkCopyErrorDetail') || 'Failed to copy link to clipboard',
      life: 3000,
    })
  }
}

// Handle smart edit
const handleSmartEdit = () => {
  showSmartEditDialog.value = true
}

// Handle changes applied from smart edit
const handleChangesApplied = async () => {
  if (!tenantId.value || !store.selectedText) return
  // Reload the current entry to show updated content
  await store.selectText(store.selectedText.id, tenantId.value)
}

// Handle set as digital twin
const handleSetDigitalTwin = async () => {
  if (!store.selectedText) return

  if (isDigitalTwinEntry.value) {
    // Remove digital twin setting
    await settingsStore.setDigitalTwinEntryPoint(null)
    toast.add({
      severity: 'info',
      summary: t('Wiki.digitalTwinRemoved') || 'Digital Twin removed',
      detail: t('Wiki.digitalTwinRemovedDetail') || 'This entry is no longer set as Digital Twin entry point',
      life: 3000,
    })
  } else {
    // Set as digital twin
    await settingsStore.setDigitalTwinEntryPoint(store.selectedText.id)
    toast.add({
      severity: 'success',
      summary: t('Wiki.digitalTwinSet') || 'Digital Twin set',
      detail: t('Wiki.digitalTwinSetDetail') || 'This entry is now set as Digital Twin entry point',
      life: 3000,
    })
  }
}

// Handle apply protocol to digital twin
const handleApplyToDigitalTwin = async () => {
  if (!store.selectedText || !tenantId.value) return

  const entryPointId = settingsStore.getDigitalTwinEntryPoint()
  if (!entryPointId) {
    toast.add({
      severity: 'warn',
      summary: t('Wiki.noDigitalTwin') || 'No Digital Twin',
      detail: t('Wiki.noDigitalTwinDetail') || 'Please set a Digital Twin entry point first',
      life: 3000,
    })
    return
  }

  // Get the protocol text (use the original transcript from the content)
  const protocolText = store.selectedText.text || editText.value
  if (!protocolText) {
    toast.add({
      severity: 'warn',
      summary: t('Wiki.noContent') || 'No Content',
      detail: t('Wiki.noContentDetail') || 'The protocol has no content to process',
      life: 3000,
    })
    return
  }

  isProcessingProtocol.value = true

  try {
    const response = await fetcher.post<{
      success: boolean
      processedFacts: number
      updatedCategories: string[]
      newCategories: string[]
      errors: string[]
    }>(`/api/v1/tenant/${tenantId.value}/digital-twin/process-protocol`, {
      entryPointId,
      protocol: protocolText,
    })

    if (response.success) {
      const factCount = response.processedFacts || 0
      const updatedCount = response.updatedCategories?.length || 0
      const newCount = response.newCategories?.length || 0

      toast.add({
        severity: 'success',
        summary: t('Wiki.protocolApplied') || 'Protocol Applied',
        detail: t('Wiki.protocolAppliedDetail', { facts: factCount, updated: updatedCount, new: newCount }) 
          || `${factCount} facts processed. ${updatedCount} categories updated, ${newCount} new categories created.`,
        life: 5000,
      })

      // Show errors if any
      if (response.errors && response.errors.length > 0) {
        toast.add({
          severity: 'warn',
          summary: t('Wiki.protocolWarnings') || 'Warnings',
          detail: response.errors.join(', '),
          life: 5000,
        })
      }
    }
  } catch (error) {
    console.error('Error applying protocol to digital twin:', error)
    toast.add({
      severity: 'error',
      summary: t('Wiki.protocolApplyError') || 'Error',
      detail: t('Wiki.protocolApplyErrorDetail') || 'Failed to apply protocol to digital twin',
      life: 3000,
    })
  } finally {
    isProcessingProtocol.value = false
  }
}
</script>

<style scoped>
/* Remove default input styles */
input[type='text'] {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}

input[type='text']:focus {
  outline: none;
}
</style>
