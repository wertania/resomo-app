<template>
  <div class="p-6">
    <AppHeader>
      <template #header v-if="selectedGroup">
        <h3 class="inline text-lg font-bold text-gray-700 dark:text-stone-300">
          {{ selectedGroup.name }}
        </h3>
      </template>
      <template #actions>
        <!-- Add Text -->
        <Button
          @click="showAddTextDialog = true"
          class="size-10 p-0"
          text
          raised
          v-tooltip.bottom="$t('Knowledge.manage.addText')"
        >
          <FluentAdd />
        </Button>
        <!-- Add PDF -->
        <Button
          @click="showAddPdfDialog = true"
          class="size-10 p-0"
          text
          raised
          v-tooltip.bottom="$t('Knowledge.manage.addPdf')"
        >
          <FluentFile />
        </Button>
      </template>
    </AppHeader>

    <!-- Use the new KnowledgeList component -->
    <KnowledgeList
      :entries="entries"
      :loading="loading"
      :error="null"
      :selectedGroup="selectedGroup"
      :visible="false"
      @update:visible="() => {}"
    />
  </div>

  <!-- Add Text Knowledge Dialog -->
  <Dialog
    v-model:visible="showAddTextDialog"
    :header="$t('Knowledge.manage.addNewKnowledge')"
    modal
    :style="{ width: '90vw', maxWidth: '60rem' }"
    :breakpoints="{ '960px': '75vw', '640px': '90vw' }"
  >
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <label>{{ $t('Knowledge.manage.textTitle') }}</label>
        <InputText v-model="newEntryTitle" />
      </div>

      <div class="flex flex-col gap-2">
        <label>{{ $t('Knowledge.manage.textToUpload') }}</label>
        <MarkdownEditor
          v-model="newEntryText"
          :placeholder="$t('Knowledge.manage.textToUploadPlaceholder')"
          height="500px"
        />
      </div>
    </div>
    <template #footer>
      <Button
        :label="$t('Common.cancel')"
        text
        @click="showAddTextDialog = false"
      />
      <Button
        :label="$t('Common.save')"
        @click="saveNewEntry"
        :loading="savingEntry"
        :disabled="!newEntryTitle || !newEntryText"
      />
    </template>
  </Dialog>

  <!-- Add PDF Dialog -->
  <Dialog
    v-model:visible="showAddPdfDialog"
    :header="$t('Knowledge.manage.addPdfFiles')"
    modal
    :style="{ width: '90vw', maxWidth: '42rem' }"
    :breakpoints="{ '960px': '75vw', '640px': '90vw' }"
  >
    <div class="flex flex-col gap-4">
      <!-- File Upload Area -->
      <FileUpload
        :customUpload="true"
        @uploader="handlePdfFilesSelected"
        :multiple="true"
        accept="application/pdf"
        :auto="false"
        :showCancelButton="false"
        class="w-full"
      >
        <template #empty>
          <div class="flex flex-col items-center justify-center">
            <FluentCloudUpload class="mb-4 text-4xl text-surface-400" />
            <p class="text-surface-600 dark:text-surface-400">
              {{ $t('Knowledge.manage.dropPdfFiles') }}
            </p>
            <p class="mt-2 text-sm text-surface-500">
              {{ $t('Knowledge.manage.orClickToSelect') }}
            </p>
          </div>
        </template>
      </FileUpload>

      <!-- Selected Files List -->
      <div v-if="pdfFiles.length > 0" class="mt-4">
        <h4 class="mb-2 font-semibold">
          {{ $t('Knowledge.manage.selectedFiles') }} ({{ pdfFiles.length }})
        </h4>
        <div class="max-h-60 space-y-2 overflow-y-auto">
          <div
            v-for="(file, index) in pdfFiles"
            :key="index"
            class="flex items-center justify-between rounded border border-surface-200 bg-surface-50 p-2 dark:border-surface-700 dark:bg-surface-800"
          >
            <div class="flex items-center gap-2">
              <FluentFile class="text-surface-500" />
              <span class="text-sm">{{ file.name }}</span>
              <span class="text-xs text-surface-500"
                >({{ formatFileSize(file.size) }})</span
              >
            </div>
            <Button
              text
              rounded
              severity="danger"
              @click="removePdfFile(index)"
              class="size-8 p-0"
            >
              <FluentDelete class="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <Button :label="$t('Common.cancel')" text @click="closePdfDialog" />
      <Button
        :label="$t('Knowledge.manage.startImport')"
        @click="startImportFromDialog"
        :disabled="pdfFiles.length === 0 || isImporting"
        :loading="isImporting"
      />
    </template>
  </Dialog>

  <!-- Import Queue Dialog -->
  <Dialog
    v-model:visible="showImportQueueDialog"
    :header="$t('Knowledge.manage.importQueue')"
    modal
    class="w-full h-full md:max-w-2xl md:h-[80vh] md:m-4"
  >
    <div class="flex flex-col gap-4">
      <div
        v-if="importQueue.length === 0"
        class="text-center p-10 text-surface-500"
      >
        {{ $t('Knowledge.manage.noFilesInQueue') }}
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="(item, index) in importQueue"
          :key="index"
          class="flex items-center gap-3 rounded border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800"
        >
          <!-- Status Icon -->
          <div class="flex size-8 items-center justify-center">
            <FluentCheckCircle
              v-if="item.status === 'done'"
              class="size-6 text-green-500"
            />
            <ProgressSpinner
              v-else-if="item.status === 'working'"
              style="width: 24px; height: 24px"
            />
            <FluentCircle v-else class="size-6 text-surface-400" />
          </div>

          <!-- File Info -->
          <div class="flex-1">
            <div class="font-medium">{{ item.file.name }}</div>
            <div class="text-xs text-surface-500">
              {{ formatFileSize(item.file.size) }}
              <span v-if="item.status === 'working'" class="ml-2"
                >{{ $t('Knowledge.manage.processing') }}...</span
              >
              <span
                v-else-if="item.status === 'done'"
                class="ml-2 text-green-600"
                >{{ $t('Knowledge.manage.completed') }}</span
              >
              <span v-else class="ml-2">{{
                $t('Knowledge.manage.pending')
              }}</span>
            </div>
          </div>

          <!-- Remove Button (only if not working) -->
          <Button
            v-if="item.status !== 'working'"
            text
            rounded
            severity="danger"
            @click="removeFromQueue(index)"
            class="size-8 p-0"
          >
            <FluentDelete class="size-4" />
          </Button>
        </div>
      </div>
    </div>
    <template #footer>
      <Button
        :label="$t('Common.close')"
        @click="showImportQueueDialog = false"
        :disabled="isImporting"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useKnowledgeBaseStore } from '@/stores/knowledgeBase'
import { useKnowledgeGroupsStore } from '@/stores/knowledgeGroups'
import { useApp } from '@/stores/main'
import { storeToRefs } from 'pinia'
import FluentAdd from '~icons/mdi/plus'
import FluentFile from '~icons/mdi/file-pdf-box'
import FluentCloudUpload from '~icons/mdi/cloud-upload'
import FluentDelete from '~icons/mdi/delete'
import FluentCheckCircle from '~icons/mdi/check-circle'
import FluentCircle from '~icons/mdi/circle-outline'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import { fetcher } from '@/utils/fetcher'
import MarkdownEditor from '@/components/knowledge/MarkdownEditor.vue'

const route = useRoute()
const knowledgeBaseStore = useKnowledgeBaseStore()
const knowledgeGroupsStore = useKnowledgeGroupsStore()
const { t } = useI18n()
const toast = useToast()
const appStore = useApp()

const { entries, loading } = storeToRefs(knowledgeBaseStore)
const { groups } = storeToRefs(knowledgeGroupsStore)

const showAddTextDialog = ref(false)
const showAddPdfDialog = ref(false)
const showImportQueueDialog = ref(false)
const newEntryTitle = ref('')
const newEntryText = ref('')
const savingEntry = ref(false)
const pdfFiles = ref<File[]>([])
const importQueue = ref<
  Array<{ file: File; status: 'pending' | 'working' | 'done'; id?: string }>
>([])
const isImporting = ref(false)

const groupId = computed(() => {
  const param = route.params.groupId as string
  // Convert 'no-assignment' back to empty string for "No Assignment" group
  return param === 'no-assignment' ? 'null' : param
})
const tenantId = computed(() => route.params.tenantId as string)
const selectedGroup = computed(() =>
  groups.value.find((g) => g.id === groupId.value),
)

onMounted(async () => {
  if (groups.value.length === 0) {
    await knowledgeGroupsStore.fetchGroups(tenantId.value)
  }
  // Only fetch entries with knowledgeGroupId if groupId is not empty
  // Empty groupId means "No Assignment" - fetch entries without group filter
  if (groupId.value) {
    knowledgeBaseStore.fetchEntries(tenantId.value, {
      knowledgeGroupId: groupId.value,
    })
  } else {
    // Fetch entries without knowledgeGroupId filter for "No Assignment" group
    knowledgeBaseStore.fetchEntries(tenantId.value, {})
  }
})

const saveNewEntry = async () => {
  if (!newEntryTitle.value || !newEntryText.value) {
    toast.add({
      severity: 'error',
      summary: t('Common.required'),
      life: 3000,
    })
    return
  }

  savingEntry.value = true
  try {
    const payload: any = {
      tenantId: tenantId.value,
      title: newEntryTitle.value,
      text: newEntryText.value,
      userOwned: false,
      userId: appStore.state.user?.id,
    }
    // Only include knowledgeGroupId if groupId is not empty
    if (groupId.value) {
      payload.knowledgeGroupId =
        groupId.value === 'null' ? undefined : groupId.value
    }

    await fetcher.post(
      `/api/v1/tenant/${tenantId.value}/knowledge/from-text`,
      payload,
    )

    toast.add({
      severity: 'success',
      summary: t('Common.success'),
      life: 3000,
    })
    showAddTextDialog.value = false
    newEntryTitle.value = ''
    newEntryText.value = ''
    // Refresh entries - use empty filter for "No Assignment" group
    if (groupId.value) {
      knowledgeBaseStore.fetchEntries(tenantId.value, {
        knowledgeGroupId: groupId.value,
      })
    } else {
      knowledgeBaseStore.fetchEntries(tenantId.value, {})
    }
  } catch (e) {
    console.error(e)
    toast.add({
      severity: 'error',
      summary: t('Common.error'),
      detail: e + '',
      life: 3000,
    })
  } finally {
    savingEntry.value = false
  }
}

const handlePdfFilesSelected = (event: { files: File | File[] }) => {
  // Files are already filtered by the FileUpload component based on accept="application/pdf"
  const newFiles = Array.isArray(event.files) ? event.files : [event.files]

  // Create a Set of existing file names to avoid duplicates
  const existingFileNames = new Set(
    pdfFiles.value.map((f) => `${f.name}-${f.size}-${f.lastModified}`),
  )

  // Only add files that don't already exist
  const uniqueNewFiles = newFiles.filter((file) => {
    const fileKey = `${file.name}-${file.size}-${file.lastModified}`
    return !existingFileNames.has(fileKey)
  })

  pdfFiles.value = [...pdfFiles.value, ...uniqueNewFiles]
}

const removePdfFile = (index: number) => {
  pdfFiles.value.splice(index, 1)
}

const closePdfDialog = () => {
  showAddPdfDialog.value = false
  pdfFiles.value = []
}

const startImportFromDialog = async () => {
  if (pdfFiles.value.length === 0) return

  // Add all selected PDF files to import queue
  const filesToImport = [...pdfFiles.value]
  pdfFiles.value = []

  // Add to queue and start immediately
  filesToImport.forEach((file) => {
    importQueue.value.push({
      file,
      status: 'pending',
    })
  })

  showAddPdfDialog.value = false
  showImportQueueDialog.value = true

  // Start import immediately
  await startImport()
}

const removeFromQueue = (index: number) => {
  const item = importQueue.value[index]
  if (item && item.status !== 'working') {
    importQueue.value.splice(index, 1)
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const startImport = async () => {
  if (importQueue.value.length === 0) return

  isImporting.value = true
  const pendingItems = importQueue.value.filter(
    (item) => item.status === 'pending',
  )

  // Process files sequentially
  for (let i = 0; i < pendingItems.length; i++) {
    const item = pendingItems[i]
    if (!item) continue

    const queueIndex = importQueue.value.findIndex((q) => q === item)

    if (queueIndex === -1) continue

    const queueItem = importQueue.value[queueIndex]
    if (!queueItem) continue

    // Mark as working
    queueItem.status = 'working'

    try {
      const formData = new FormData()
      formData.append('file', item.file)
      formData.append('tenantId', tenantId.value)
      if (groupId.value) {
        formData.append('knowledgeGroupId', groupId.value)
      }
      formData.append('userOwned', 'false')
      // teamId is not set - entries are always tenant-wide
      if (appStore.state.user?.id) {
        formData.append('userId', appStore.state.user.id)
      }

      const response = await fetcher.postFormData<{ id: string; ok: boolean }>(
        `/api/v1/tenant/${tenantId.value}/knowledge/upload-and-extract`,
        formData,
      )

      // Mark as done
      queueItem.status = 'done'
      queueItem.id = response.id
    } catch (e) {
      console.error('Error uploading file:', e)
      toast.add({
        severity: 'error',
        summary: t('Common.error'),
        detail: `${item.file.name}: ${e}`,
        life: 5000,
      })
      // Remove failed item from queue
      importQueue.value.splice(queueIndex, 1)
    }
  }

  isImporting.value = false

  // Refresh entries list if any imports succeeded
  const successCount = importQueue.value.filter(
    (item) => item.status === 'done',
  ).length
  if (successCount > 0) {
    toast.add({
      severity: 'success',
      summary: t('Common.success'),
      detail: t('Knowledge.manage.filesImported', { count: successCount }),
      life: 3000,
    })
    // Refresh entries - use empty filter for "No Assignment" group
    if (groupId.value) {
      knowledgeBaseStore.fetchEntries(tenantId.value, {
        knowledgeGroupId: groupId.value,
      })
    } else {
      knowledgeBaseStore.fetchEntries(tenantId.value, {})
    }
  }

  // Clear completed items and close dialog if all done
  const allDone = importQueue.value.every((item) => item.status === 'done')
  if (allDone) {
    setTimeout(() => {
      importQueue.value = []
      showImportQueueDialog.value = false
    }, 2000)
  }
}
</script>
