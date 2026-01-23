<template>
  <!-- Dialog for displaying knowledge entry details -->
  <Dialog
    v-model:visible="knowledgeStore.showDetailsDialog"
    pt:content="p-0"
    pt:header="px-4 pr-2.5 py-2 border-b dark:border-surface-700"
    class="w-[95%] max-w-[740px] h-full md:h-[80vh]"
    :header="
      knowledgeStore.selectedEntry?.entry.name ||
      $t('Knowledge.manage.entryDetails')
    "
    modal
  >
    <div v-if="knowledgeStore.selectedEntry" class="space-y-4">
      <div v-if="knowledgeStore.loadingDetails" class="py-4 text-center">
        <ProgressSpinner />
      </div>
      <div v-else>
        <!-- Tab Navigation -->
        <div
          class="sticky top-0 z-50 border-b border-surface-200 bg-surface-0 dark:border-surface-700 dark:bg-surface-900"
        >
          <div class="flex gap-1 px-4">
            <button
              @click="activeTab = 'summary'"
              class="relative px-5 py-3 text-sm font-medium transition-all duration-200 ease-in-out"
              :class="
                activeTab === 'summary'
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-300'
              "
            >
              <span class="relative z-10">{{
                $t('Knowledge.manage.summary')
              }}</span>
              <span
                v-if="activeTab === 'summary'"
                class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400 transition-all duration-200"
              ></span>
            </button>
            <button
              @click="activeTab = 'content'"
              class="relative px-5 py-3 text-sm font-medium transition-all duration-200 ease-in-out"
              :class="
                activeTab === 'content'
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-300'
              "
            >
              <span class="relative z-10">{{
                $t('Knowledge.manage.content')
              }}</span>
              <span
                v-if="activeTab === 'content'"
                class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400 transition-all duration-200"
              ></span>
            </button>
            <button
              @click="activeTab = 'assignments'"
              class="relative px-5 py-3 text-sm font-medium transition-all duration-200 ease-in-out"
              :class="
                activeTab === 'assignments'
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-300'
              "
            >
              <span class="relative z-10">{{
                $t('Knowledge.manage.assignments')
              }}</span>
              <span
                v-if="activeTab === 'assignments'"
                class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400 transition-all duration-200"
              ></span>
            </button>
          </div>
        </div>

        <!-- Tab Content -->
        <div v-if="activeTab === 'summary'" class="p-4">
          <KnowledgeSummary @close="knowledgeStore.showDetailsDialog = false" />
        </div>

        <div v-else-if="activeTab === 'content'" class="p-4">
          <div
            v-if="!isEditingText"
            class="whitespace-pre-wrap rounded border bg-gray-50 p-4 dark:border-surface-700 dark:bg-surface-800"
          >
            {{ knowledgeStore.selectedEntry.text }}
            <div class="mt-4 flex justify-end">
              <Button
                :label="$t('Common.edit')"
                @click="isEditingText = true"
                size="small"
              />
            </div>
          </div>
          <div v-else class="space-y-4">
            <MarkdownEditor v-model="editingText" />
            <div class="flex justify-end gap-2">
              <Button
                :label="$t('Common.cancel')"
                text
                @click="cancelEditText"
              />
              <Button
                :label="$t('Common.save')"
                @click="saveText"
                :loading="savingText"
              />
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'assignments'" class="p-4">
          <KnowledgeEditAssignments
            :entry="knowledgeStore.selectedEntry.entry"
            @update:assignments="refreshEntryDetails"
            @close="knowledgeStore.showDetailsDialog = false"
          />
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useKnowledgeBaseStore } from '@/stores/knowledgeBase'
import { useUser } from '@/stores/user'
import { fetcher } from '@/utils/fetcher'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import MarkdownEditor from '@/components/knowledge/MarkdownEditor.vue'

const knowledgeStore = useKnowledgeBaseStore()
const userStore = useUser()
const toast = useToast()
const { t } = useI18n()

// Active tab state
const activeTab = ref('summary')
const isEditingText = ref(false)
const editingText = ref('')
const savingText = ref(false)


// Refresh the entry details when assignments are updated
const refreshEntryDetails = async () => {
  const entryId = knowledgeStore.selectedEntry?.entry?.id
  if (!entryId || !userStore.state.selectedTenant) return

  const route = useRoute()
  const currentGroupId = route.params.groupId as string

  // Refresh entry details to get updated data
  await knowledgeStore.showEntryDetails(
    userStore.state.selectedTenant,
    entryId,
  )

  // Get the updated entry with new knowledgeGroupId
  const updatedEntry = knowledgeStore.selectedEntry?.entry
  const newGroupId = updatedEntry?.knowledgeGroupId || null

  // If the entry was moved to a different group and we're viewing the old group, close dialog
  if (currentGroupId && newGroupId !== currentGroupId) {
    knowledgeStore.showDetailsDialog = false
  }
}

watch(
  () => knowledgeStore.showDetailsDialog,
  (newVal) => {
    if (newVal) {
      activeTab.value = knowledgeStore.initialDetailsTab
      isEditingText.value = false
    }
  },
)

watch(
  () => knowledgeStore.selectedEntry,
  (newEntry) => {
    if (newEntry) {
      editingText.value = newEntry.text || ''
    }
  },
  { immediate: true },
)

const cancelEditText = () => {
  isEditingText.value = false
  if (knowledgeStore.selectedEntry) {
    editingText.value = knowledgeStore.selectedEntry.text || ''
  }
}

const saveText = async () => {
  if (
    !knowledgeStore.selectedEntry?.entry?.id ||
    !userStore.state.selectedTenant
  ) {
    return
  }

  savingText.value = true
  try {
    await fetcher.put(
      `/api/v1/tenant/${userStore.state.selectedTenant}/knowledge/entries/${knowledgeStore.selectedEntry.entry.id}/text`,
      {
        text: editingText.value,
      },
    )

    // Refresh the entry details
    await knowledgeStore.showEntryDetails(
      userStore.state.selectedTenant,
      knowledgeStore.selectedEntry.entry.id,
    )

    isEditingText.value = false

    toast.add({
      severity: 'success',
      summary: t('Knowledge.manage.entryUpdated'),
      life: 3000,
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: t('Knowledge.manage.errorUpdating'),
      life: 3000,
    })
  } finally {
    savingText.value = false
  }
}
</script>
