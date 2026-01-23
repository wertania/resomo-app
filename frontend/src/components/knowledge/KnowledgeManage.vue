<template>
  <div class="mx-auto max-w-7xl p-4">
    <div class="flex gap-4 maxlg:flex-col">
      <!-- Main Content -->
      <div class="flex-1">
        <!-- Bulk Actions Bar -->
        <div
          v-if="showToolbar && selectedEntries.length > 0"
          class="sticky top-[76px] z-10 mb-4 rounded-lg bg-white p-4 shadow dark:bg-surface-800 dark:shadow-xl"
        >
          <div
            class="flex items-center justify-between maxmd:gap-4 maxlg:flex-wrap"
          >
            <!-- Selected Entries -->
            <span class="text-sm text-gray-600 dark:text-slate-200">
              {{
                $t('Knowledge.manage.selectedEntries', {
                  count: selectedEntries.length,
                })
              }}
            </span>
            <!-- Bulk Actions -->
            <div class="flex gap-2 maxlg:flex-wrap">
              <template v-if="selectedEntries.length > 0">
                <Button
                  text
                  v-tooltip.bottom="$t('Common.unselectAll')"
                  @click="knowledgeStore.clearSelection"
                >
                  <IconFluentCheckboxUnchecked24Regular />
                </Button>
                <Button
                  v-if="showManageFields"
                  text
                  v-tooltip.bottom="$t('Knowledge.manage.deleteSelected')"
                  @click="knowledgeStore.confirmDeleteSelected(tenantId)"
                >
                  <IconFluentDelete24Regular class="text-sm" />
                </Button>
              </template>
            </div>
          </div>
        </div>

        <div class="rounded-lg">
          <div v-if="filteredEntries.length === 0" class="py-16 text-center">
            <div
              class="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-700"
            >
              <IconFluentDocument24Regular
                class="size-8 text-surface-400 dark:text-surface-500"
              />
            </div>
            <p
              class="text-base font-medium text-surface-700 dark:text-surface-300"
            >
              {{ $t('Knowledge.manage.noEntriesFound') }}
            </p>
            <p class="mt-1 text-sm text-surface-500 dark:text-surface-400">
              {{ $t('Knowledge.manage.addFirstEntry') }}
            </p>
          </div>

          <ul v-else class="space-y-4">
            <!-- All Entries -->
            <KnowledgeEntry
              v-for="entry in filteredEntries"
              :key="entry.id"
              :entry="entry"
              :model-value="selectedEntries.includes(entry.id)"
              @selection-change="knowledgeStore.handleSelectionChange"
            >
              <!-- Details -->
              <template #header>{{ entry.name }}</template>

              <!-- Actions -->
              <template #actions>
                <Button
                  v-tooltip.bottom="$t('Common.view')"
                  size="small"
                  severity="secondary"
                  text
                  rounded
                  @click="showEntryDetails(entry.id)"
                >
                  <IconFluentEye24Regular class="size-4" />
                </Button>
                <Button
                  v-if="showManageFields"
                  v-tooltip.bottom="$t('Common.edit')"
                  size="small"
                  severity="secondary"
                  text
                  rounded
                  @click="editEntry(entry.id)"
                >
                  <IconFluentEdit24Regular class="size-4" />
                </Button>
                <Button
                  v-if="showManageFields"
                  v-tooltip.bottom="$t('Common.drop')"
                  size="small"
                  severity="danger"
                  text
                  rounded
                  @click="dropEntry(entry.id)"
                >
                  <IconFluentDelete24Regular class="size-4" />
                </Button>
              </template>
            </KnowledgeEntry>
          </ul>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import type { KnowledgeEntry } from '@/types/knowledge'
import type { KnowledgeGroup } from '@/types/knowledgeGroup'
import IconFluentCheckboxUnchecked24Regular from '~icons/line-md/square'
import IconFluentEye24Regular from '~icons/line-md/search'
import IconFluentEdit24Regular from '~icons/line-md/pencil'
import IconFluentDelete24Regular from '~icons/line-md/trash'
import IconFluentDocument24Regular from '~icons/line-md/file-document'
import { useKnowledgeBaseStore } from '@/stores/knowledgeBase'
import { useUser } from '@/stores/user'

const {
  readonly = false,
  showToolbar = true,
  showManageFields = true,
  entries: propEntries = [],
  loading: propLoading = false,
  selectedGroup = null,
} = defineProps<{
  readonly?: boolean
  showToolbar?: boolean
  showManageFields?: boolean
  entries?: KnowledgeEntry[]
  loading?: boolean
  error?: string | null
  selectedGroup?: KnowledgeGroup | null
}>()

const userStore = useUser()
const knowledgeStore = useKnowledgeBaseStore()

const tenantId = computed(() => userStore.state.selectedTenant)

// Use props if provided, otherwise use the store values
const loading = computed(() => propLoading || knowledgeStore.loading)
const filteredEntries = computed(() => {
  // If entries are provided through props, use them
  if (propEntries.length > 0) {
    return propEntries
  }
  // Otherwise, use the entries from the store
  return knowledgeStore.entries
})

const selectedEntries = computed(() => knowledgeStore.selectedEntries)

const showEntryDetails = async (id: string) => {
  if (!tenantId.value) return
  await knowledgeStore.showEntryDetails(tenantId.value, id)
}

const dropEntry = async (id: string) => {
  if (!tenantId.value) return
  await knowledgeStore.dropEntry(tenantId.value, id)
}

const editEntry = async (id: string) => {
  if (!tenantId.value) return
  // Open details dialog and switch directly to content tab for editing
  await knowledgeStore.showEntryDetails(tenantId.value, id, 'content')
}
</script>
