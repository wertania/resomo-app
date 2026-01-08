<template>
  <div class="flex h-full bg-surface-50 dark:bg-surface-900">
    <!-- Left Sidebar: Tree View -->
    <div
      class="flex w-80 flex-col border-r border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between border-b border-surface-200 bg-surface-50 px-4 py-3 dark:border-surface-700 dark:bg-surface-900"
      >
        <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-0">
          {{ $t('Wiki.title') || 'Wiki' }}
        </h2>
        <Button
          severity="success"
          size="small"
          class="h-8 w-8"
          @click="handleAddRoot"
          :disabled="!tenantId"
        >
          <IconAdd class="h-4 w-4" />
        </Button>
      </div>

      <!-- Tree Container -->
      <div class="flex-1 overflow-y-auto p-3">
        <WikiTree
          :items="store.treeData"
          :selected-id="store.selectedText?.id || null"
          @select="handleSelectText"
          @add-child="handleAddChild"
          @edit="handleEdit"
          @delete="handleDelete"
        />
      </div>
    </div>

    <!-- Right Side: Editor -->
    <div class="flex flex-1 flex-col">
      <!-- Editor Header -->
      <div
        v-if="store.selectedText"
        class="flex items-center justify-between border-b border-surface-200 bg-white px-6 py-4 dark:border-surface-700 dark:bg-surface-800"
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
  </div>
</template>

<script setup lang="ts">
import { useKnowledgeTextsStore } from '@/stores/knowledgeTexts'
import { useApp } from '@/stores/main'
import WikiTree from '@/components/wiki/WikiTree.vue'
import MarkdownEditor from '@/components/knowledge/MarkdownEditor.vue'
import IconAdd from '~icons/mdi/plus'
import IconSave from '~icons/mdi/content-save'
import IconDocument from '~icons/mdi/file-document-outline'
import IconDelete from '~icons/mdi/delete-outline'

const store = useKnowledgeTextsStore()
const appStore = useApp()

const tenantId = computed(() => appStore.state.selectedTenant)
const editTitle = ref('')
const editText = ref('')

// Watch for tenant change
watch(
  tenantId,
  async (newTenantId) => {
    if (newTenantId) {
      await store.fetchTexts(newTenantId)
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
const handleAddRoot = async () => {
  if (!tenantId.value) return

  // If an entry is selected, make the new entry a child of it
  const parentId = store.selectedText?.id || null

  const newText = await store.createText(tenantId.value, {
    title: 'New Entry',
    text: 'Start writing...',
    parentId,
  })

  if (newText) {
    await store.selectText(newText.id, tenantId.value)
  }
}

// Handle add child entry
const handleAddChild = async (parentId: string) => {
  if (!tenantId.value) return

  const newText = await store.createText(tenantId.value, {
    title: 'New Entry',
    text: 'Start writing...',
    parentId,
  })

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
