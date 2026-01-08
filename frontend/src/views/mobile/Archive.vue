<template>
  <div class="flex flex-col items-center justify-center gap-8 w-full">
      <div v-if="archiveStore.loading" class="mt-8 text-lg text-gray-500 dark:text-surface-400">
        Loading...
      </div>
      <div v-else-if="archiveStore.error" class="mt-8 text-lg text-red-500">
        {{ archiveStore.error }}
      </div>
      <div v-else-if="archiveStore.entries.length === 0" class="mt-8 text-lg text-gray-400 dark:text-surface-500">
        No entries found.
      </div>
      <div v-else class="w-full max-w-xl flex flex-col gap-6 mt-4 p-3">
        <div
          v-for="entry in archiveStore.entries"
          :key="entry.id"
          class="relative group bg-white dark:bg-surface-800 rounded-2xl shadow-md p-6 flex flex-col gap-2 transition-all duration-200 hover:shadow-xl hover:border-[#5f8353] active:scale-[0.98] cursor-pointer focus-within:ring-2 focus-within:ring-[#5f8353] w-full"
        >
          <!-- X Button -->
          <button
            class="absolute top-1/2 right-4 -translate-y-1/2 text-[#a27029] hover:text-[#5f8353] bg-white dark:bg-surface-800 rounded-full p-1 shadow focus:outline-none focus:ring-2 focus:ring-[#5f8353]"
            style="z-index:10;"
            title="Delete entry"
            @click.stop="openDeleteDialog(entry)"
            aria-label="Delete entry"
            type="button"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="6" y1="18" x2="18" y2="6" />
            </svg>
          </button>
          <!-- Card content clickable area -->
          <div
            @click="handleEntryClick(entry)"
            @keydown="(e) => (e.key === 'Enter' || e.key === ' ') && handleEntryClick(entry)"
            role="button"
            tabindex="0"
            class="flex flex-col gap-2 select-none"
          >
            <div class="flex items-center gap-2">
              <span
                class="text-xl font-semibold text-[#5f8353] dark:text-primary-400 group-hover:text-[#a27029] transition-colors"
              >
                {{ entry.session_name }}
              </span>
              <!-- Edit Button -->
              <button
                class="ml-2 text-[#a27029] hover:text-[#5f8353] bg-transparent rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-[#5f8353]"
                title="Edit name"
                @click.stop="openEditDialog(entry)"
                aria-label="Edit name"
                type="button"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M15.232 5.232l3.536 3.536M9 13l6.071-6.071a2 2 0 1 1 2.828 2.828L11.828 15.828a4 4 0 0 1-2.828 1.172H7v-2a4 4 0 0 1 1.172-2.828z"
                  />
                </svg>
              </button>
            </div>
            <div class="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-surface-400">
              <!-- Calendar Icon -->
              <svg
                class="w-4 h-4 text-[#a27029] opacity-80"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <rect
                  x="3"
                  y="5"
                  width="18"
                  height="16"
                  rx="2"
                  stroke="currentColor"
                  fill="none"
                />
                <path d="M16 3v4M8 3v4M3 9h18" stroke="currentColor" />
              </svg>
              <span>{{ formatDate(entry.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <Dialog
      v-model:visible="showDeleteDialog"
      modal
      :header="'Löschen bestätigen'"
      :style="{ width: '90vw', maxWidth: '400px' }"
    >
      <div class="text-center text-lg font-medium py-2">
        <span v-if="entryToDelete">
          Möchtest du
          <span class="font-bold text-[#a27029]">{{ entryToDelete.session_name }}</span>
          wirklich löschen?
        </span>
      </div>
      <template #footer>
        <Button
          label="Ja"
          @click="handleDeleteConfirmed"
          class="bg-[#5f8353]"
        />
        <Button
          label="Abbrechen"
          severity="secondary"
          outlined
          @click="showDeleteDialog = false"
        />
      </template>
    </Dialog>

    <!-- Edit Name Dialog -->
    <Dialog
      v-model:visible="showEditDialog"
      modal
      header="Name bearbeiten"
      :style="{ width: '90vw', maxWidth: '400px' }"
    >
      <div v-if="entryToEdit" class="w-full flex flex-col gap-4">
        <label
          for="edit-session-name"
          class="text-sm font-medium text-gray-700 dark:text-surface-300"
        >
          Neuer Name
        </label>
        <InputText
          id="edit-session-name"
          v-model="editNameValue"
          class="w-full"
          required
          maxlength="64"
          autocomplete="off"
        />
      </div>
      <template #footer>
        <Button
          label="OK"
          @click="handleEditConfirmed"
          class="bg-[#5f8353]"
        />
        <Button
          label="Abbrechen"
          severity="secondary"
          outlined
          @click="showEditDialog = false"
        />
      </template>
    </Dialog>
</template>

<script setup lang="ts">
import { useArchiveStore } from '@/stores/archive'
import { useNotificationStore } from '@/stores/notifications'
import { useRouter } from 'vue-router'
import type { ArchiveEntry } from '@/stores/archive'

const archiveStore = useArchiveStore()
const notificationStore = useNotificationStore()
const router = useRouter()

const showDeleteDialog = ref(false)
const entryToDelete = ref<ArchiveEntry | null>(null)
const showEditDialog = ref(false)
const entryToEdit = ref<ArchiveEntry | null>(null)
const editNameValue = ref('')

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function handleEntryClick(entry: ArchiveEntry) {
  router.push(`/mobile/archive-entry?id=${encodeURIComponent(String(entry.id))}`)
}

function openDeleteDialog(entry: ArchiveEntry) {
  entryToDelete.value = entry
  showDeleteDialog.value = true
}

function openEditDialog(entry: ArchiveEntry) {
  entryToEdit.value = { ...entry }
  editNameValue.value = entry.session_name
  showEditDialog.value = true
}

async function handleDeleteConfirmed() {
  if (!entryToDelete.value) return
  await archiveStore.deleteEntry(entryToDelete.value.id)
  notificationStore.addNotification({
    id: `delete_${entryToDelete.value.id}`,
    message: `Entry '${entryToDelete.value.session_name}' deleted`,
    type: 'standard',
    timestamp: new Date(),
  })
  showDeleteDialog.value = false
  entryToDelete.value = null
}

async function handleEditConfirmed() {
  if (!entryToEdit.value) return
  await archiveStore.updateEntry(entryToEdit.value.id, editNameValue.value)
  notificationStore.addNotification({
    id: `edit_${entryToEdit.value.id}`,
    message: `Name updated to '${editNameValue.value}'`,
    type: 'standard',
    timestamp: new Date(),
  })
  showEditDialog.value = false
  entryToEdit.value = null
}

onMounted(async () => {
  await archiveStore.fetchEntries()
})
</script>

