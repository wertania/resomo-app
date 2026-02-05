<template>
  <div class="flex h-full flex-col bg-surface-50 dark:bg-surface-900">
    <!-- Header -->
    <div
      class="flex h-16 items-center justify-between border-b border-surface-200 bg-white px-6 dark:border-surface-700 dark:bg-surface-800"
    >
      <h1 class="text-2xl font-semibold text-surface-900 dark:text-surface-0">
        {{ $t('Archiv.title') || 'Archiv' }}
      </h1>
      <Button
        label="Upload Interview"
        icon="pi pi-upload"
        @click="showUploadDialog = true"
        :disabled="!tenantId"
      />
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6">
      <div v-if="loading" class="flex justify-center py-12">
        <ProgressSpinner />
      </div>

      <div
        v-else-if="sessions.length === 0"
        class="flex flex-col items-center justify-center py-12"
      >
        <p class="text-surface-500 dark:text-surface-400">
          {{ $t('Archiv.noSessions') || 'No interview sessions yet' }}
        </p>
        <Button
          label="Upload Interview"
          icon="pi pi-upload"
          class="mt-4"
          @click="showUploadDialog = true"
          :disabled="!tenantId"
        />
      </div>

      <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card
          v-for="session in sessions"
          :key="session.id"
          class="cursor-pointer transition-shadow hover:shadow-lg"
          @click="openEditDialog(session)"
        >
          <template #content>
            <div class="p-4">
              <h3
                class="mb-2 text-lg font-semibold text-surface-900 dark:text-surface-0"
              >
                {{ session.name }}
              </h3>
              <p
                v-if="session.description"
                class="mb-3 text-sm text-surface-600 dark:text-surface-400 line-clamp-2"
              >
                {{ session.description }}
              </p>
              <div class="flex items-center gap-4 text-xs text-surface-500 dark:text-surface-400">
                <span>
                  {{ formatDate(session.createdAt) }}
                </span>
                <span v-if="session.meta?.duration">
                  {{ formatDuration(session.meta.duration) }}
                </span>
                <span v-if="session.transcript?.language">
                  {{ session.transcript.language.toUpperCase() }}
                </span>
              </div>
              <div
                v-if="session.transcript?.segments"
                class="mt-3 flex flex-wrap items-center gap-2 text-xs text-surface-500 dark:text-surface-400"
              >
                <span>
                  {{ session.transcript.segments.length }}
                  {{ $t('Archiv.segments') || 'segments' }}
                </span>
                <span
                  v-if="session.meta?.mainCharacterId"
                  class="rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                >
                  ⭐ {{ getMainCharacterName(session) }}
                </span>
                <span
                  v-if="session.meta?.wikiProcessed"
                  class="rounded-full bg-green-100 px-2 py-0.5 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                >
                  📚 {{ $t('Archiv.wikiDone') || 'Wiki' }}
                </span>
                <span
                  v-if="session.meta?.knowledgeEntryId"
                  class="rounded-full bg-purple-100 px-2 py-0.5 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                >
                  🔍 {{ $t('Archiv.chatActive') || 'Chat' }}
                </span>
              </div>
              <div
                v-else-if="session.meta?.transcriptionStatus === 'pending' || session.meta?.transcriptionStatus === 'processing'"
                class="mt-3 text-xs text-yellow-600 dark:text-yellow-400"
              >
                {{ $t('Archiv.transcribing') || 'Transcribing...' }}
              </div>
              <div
                v-else-if="session.meta?.transcriptionStatus === 'error'"
                class="mt-3 text-xs text-red-600 dark:text-red-400"
              >
                {{ $t('Archiv.transcriptionError') || 'Transcription error' }}
                <span v-if="session.meta?.elevenlabsTranscriptionId" class="ml-1 text-surface-400">
                  (ID: {{ session.meta.elevenlabsTranscriptionId.slice(0, 8) }}...)
                </span>
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>

    <!-- Upload Dialog -->
    <Dialog
      v-model:visible="showUploadDialog"
      :header="$t('Archiv.uploadInterview') || 'Upload Interview'"
      :modal="true"
      :style="{ width: '90vw', maxWidth: '500px' }"
      @hide="resetUploadForm"
    >
      <div class="flex flex-col gap-4">
        <div>
          <label class="mb-2 block text-sm font-medium text-surface-700 dark:text-surface-300">
            {{ $t('Archiv.audioFile') || 'Audio File' }}
          </label>
          <FileUpload
            mode="basic"
            :auto="false"
            :max-file-size="500000000"
            accept="audio/*"
            choose-label="Choose File"
            @select="handleFileSelect"
            class="w-full"
          />
          <small class="text-surface-500 dark:text-surface-400">
            {{ $t('Archiv.supportedFormats') || 'Supported formats: MP3, WAV, WebM, OGG, M4A, FLAC' }}
          </small>
        </div>

        <div>
          <label class="mb-2 block text-sm font-medium text-surface-700 dark:text-surface-300">
            {{ $t('Archiv.name') || 'Name' }}
            <span class="text-red-500">*</span>
          </label>
          <InputText
            v-model="uploadForm.name"
            :placeholder="$t('Archiv.namePlaceholder') || 'Enter interview name'"
            class="w-full"
          />
        </div>

        <div>
          <label class="mb-2 block text-sm font-medium text-surface-700 dark:text-surface-300">
            {{ $t('Archiv.description') || 'Description' }}
            <span class="text-surface-400">({{ $t('Archiv.optional') || 'optional' }})</span>
          </label>
          <Textarea
            v-model="uploadForm.description"
            :placeholder="$t('Archiv.descriptionPlaceholder') || 'Enter description'"
            rows="3"
            class="w-full"
          />
        </div>

        <div v-if="uploadProgress > 0" class="mt-2">
          <ProgressBar :value="uploadProgress" />
          <small class="text-surface-500 dark:text-surface-400">
            {{ $t('Archiv.uploading') || 'Uploading and transcribing...' }}
          </small>
        </div>
      </div>

      <template #footer>
        <Button
          :label="$t('Archiv.cancel') || 'Cancel'"
          severity="secondary"
          text
          @click="showUploadDialog = false"
        />
        <Button
          :label="$t('Archiv.upload') || 'Upload'"
          :disabled="!uploadForm.file || !uploadForm.name || isUploading"
          :loading="isUploading"
          @click="handleUpload"
        />
      </template>
    </Dialog>

    <!-- Edit Dialog -->
    <Dialog
      v-model:visible="showEditDialog"
      :header="$t('Archiv.editInterview') || 'Edit Interview'"
      :modal="true"
      :style="{ width: '90vw', maxWidth: '600px' }"
    >
      <div v-if="editingSession" class="flex flex-col gap-4">
        <div>
          <label class="mb-2 block text-sm font-medium text-surface-700 dark:text-surface-300">
            {{ $t('Archiv.name') || 'Name' }}
            <span class="text-red-500">*</span>
          </label>
          <InputText
            v-model="editForm.name"
            :placeholder="$t('Archiv.namePlaceholder') || 'Enter interview name'"
            class="w-full"
          />
        </div>

        <div>
          <label class="mb-2 block text-sm font-medium text-surface-700 dark:text-surface-300">
            {{ $t('Archiv.description') || 'Description' }}
            <span class="text-surface-400">({{ $t('Archiv.optional') || 'optional' }})</span>
          </label>
          <Textarea
            v-model="editForm.description"
            :placeholder="$t('Archiv.descriptionPlaceholder') || 'Enter description'"
            rows="3"
            class="w-full"
          />
        </div>

        <div v-if="editingSession.transcript" class="mt-4">
          <!-- Main Character Selection -->
          <div class="mb-4">
            <h4 class="mb-2 text-sm font-semibold text-surface-700 dark:text-surface-300">
              {{ $t('Archiv.mainCharacter') || 'Main Character' }}
            </h4>
            <Select
              v-model="editForm.mainCharacterId"
              :options="availableSpeakers"
              option-label="name"
              option-value="id"
              :placeholder="$t('Archiv.selectMainCharacter') || 'Select the main character...'"
              class="w-full"
              show-clear
            />
            <small class="text-surface-500 dark:text-surface-400">
              {{ $t('Archiv.mainCharacterHint') || 'The person this interview is about' }}
            </small>
          </div>

          <!-- Speaker Types (if analyzed) -->
          <div v-if="editingSession.meta?.speakerTypes" class="mb-4">
            <h4 class="mb-2 text-sm font-semibold text-surface-700 dark:text-surface-300">
              {{ $t('Archiv.speakerTypes') || 'Speaker Types' }}
            </h4>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="(type, speakerId) in editingSession.meta.speakerTypes"
                :key="speakerId"
                class="rounded-full border px-3 py-1 text-xs"
                :class="{
                  'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300': type === 'host',
                  'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300': type === 'interviewee',
                  'ring-2 ring-yellow-400': speakerId === editingSession.meta?.mainCharacterId,
                }"
              >
                {{ editingSession.transcript.segments.find(s => s.speaker.id === speakerId)?.speaker.name || `Speaker ${speakerId}` }}:
                <span class="font-semibold">{{ type }}</span>
                <span v-if="speakerId === editingSession.meta?.mainCharacterId" class="ml-1">⭐</span>
              </div>
            </div>
          </div>

          <!-- Wiki Processing Status -->
          <div v-if="editingSession.meta?.wikiProcessed" class="mb-4">
            <h4 class="mb-2 text-sm font-semibold text-surface-700 dark:text-surface-300">
              {{ $t('Archiv.wikiStatus') || 'Wiki Status' }}
            </h4>
            <div class="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
              <div class="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                <span class="text-lg">✅</span>
                <span>{{ $t('Archiv.wikiProcessed') || 'Wissen wurde ins Wiki extrahiert' }}</span>
              </div>
              <div v-if="editingSession.meta.wikiProcessedResult" class="mt-2 text-xs text-green-600 dark:text-green-400">
                <div>{{ editingSession.meta.wikiProcessedResult.processedFacts || 0 }} {{ $t('Archiv.factsExtracted') || 'Informationen extrahiert' }}</div>
                <div v-if="editingSession.meta.wikiProcessedResult.updatedCategories?.length > 0">
                  {{ $t('Archiv.updatedCategories') || 'Aktualisiert' }}: {{ editingSession.meta.wikiProcessedResult.updatedCategories.join(', ') }}
                </div>
                <div v-if="editingSession.meta.wikiProcessedResult.newCategories?.length > 0">
                  {{ $t('Archiv.newCategories') || 'Neu erstellt' }}: {{ editingSession.meta.wikiProcessedResult.newCategories.join(', ') }}
                </div>
              </div>
              <div v-if="editingSession.meta.wikiProcessedAt" class="mt-1 text-xs text-surface-500">
                {{ new Date(editingSession.meta.wikiProcessedAt).toLocaleString('de-DE') }}
              </div>
            </div>
          </div>

          <!-- Knowledge Embedding for Chat -->
          <div class="mb-4">
            <h4 class="mb-2 text-sm font-semibold text-surface-700 dark:text-surface-300">
              {{ $t('Archiv.chatEmbedding') || 'Chat-Suche (Embedding)' }}
            </h4>
            <div v-if="editingSession.meta?.knowledgeEntryId" class="rounded-lg border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-900/20">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300">
                  <span class="text-lg">🔍</span>
                  <span>{{ $t('Archiv.embeddingActive') || 'Interview ist für Chat-Suche aktiviert' }}</span>
                </div>
                <Button
                  :label="$t('Archiv.refreshEmbedding') || 'Aktualisieren'"
                  size="small"
                  severity="secondary"
                  outlined
                  :loading="isCreatingEmbedding"
                  @click="handleCreateEmbedding"
                />
              </div>
              <div v-if="editingSession.meta.knowledgeEmbeddedAt" class="mt-1 text-xs text-surface-500">
                {{ $t('Archiv.embeddedAt') || 'Erstellt am' }}: {{ new Date(editingSession.meta.knowledgeEmbeddedAt).toLocaleString('de-DE') }}
              </div>
            </div>
            <div v-else class="rounded-lg border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800">
              <div class="flex items-center justify-between">
                <div class="text-sm text-surface-600 dark:text-surface-400">
                  {{ $t('Archiv.embeddingNotActive') || 'Interview ist noch nicht für Chat-Suche aktiviert' }}
                </div>
                <Button
                  :label="$t('Archiv.createEmbedding') || 'Für Chat aktivieren'"
                  size="small"
                  severity="help"
                  :loading="isCreatingEmbedding"
                  @click="handleCreateEmbedding"
                />
              </div>
              <div class="mt-2 text-xs text-surface-500 dark:text-surface-400">
                {{ $t('Archiv.embeddingHint') || 'Ermöglicht semantische Suche im Chat über dieses Interview' }}
              </div>
            </div>
          </div>

          <h4 class="mb-2 text-sm font-semibold text-surface-700 dark:text-surface-300">
            {{ $t('Archiv.transcript') || 'Transcript' }}
            <span class="text-xs font-normal text-surface-400">({{ $t('Archiv.readOnly') || 'read-only' }})</span>
          </h4>
          <div
            class="max-h-96 overflow-y-auto rounded border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800"
          >
            <div
              v-for="(segment, index) in editingSession.transcript.segments"
              :key="index"
              class="mb-3 border-l-4 border-primary pl-3"
            >
              <div class="mb-1 text-xs font-semibold text-primary">
                {{ segment.speaker.name }}
                <span
                  v-if="editingSession.meta?.speakerTypes?.[segment.speaker.id]"
                  class="ml-1 rounded px-1.5 py-0.5 text-xs"
                  :class="{
                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300': editingSession.meta.speakerTypes[segment.speaker.id] === 'host',
                    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300': editingSession.meta.speakerTypes[segment.speaker.id] === 'interviewee',
                  }"
                >
                  {{ editingSession.meta.speakerTypes[segment.speaker.id] }}
                </span>
                <span class="text-surface-400">
                  ({{ formatTime(segment.startTime) }}
                  <span v-if="segment.endTime"> - {{ formatTime(segment.endTime) }}</span>)
                </span>
              </div>
              <div class="text-sm text-surface-700 dark:text-surface-300">
                {{ segment.text }}
              </div>
            </div>
          </div>
        </div>
        <div v-else class="mt-4">
          <p class="text-sm text-yellow-600 dark:text-yellow-400">
            {{ $t('Archiv.transcribing') || 'Transcribing...' }}
          </p>
        </div>
      </div>

      <template #footer>
        <div class="flex w-full items-center justify-between">
          <!-- Actions Menu -->
          <Menu ref="actionsMenu" :model="actionMenuItems" :popup="true" />
          <Button
            :label="$t('Archiv.actions') || 'Actions'"
            icon="pi pi-ellipsis-v"
            severity="secondary"
            outlined
            @click="toggleActionsMenu"
            :disabled="!editingSession?.transcript"
          />

          <!-- Main Actions -->
          <div class="flex gap-2">
            <Button
              :label="$t('Archiv.cancel') || 'Cancel'"
              severity="secondary"
              text
              @click="showEditDialog = false"
            />
            <Button
              :label="$t('Archiv.save') || 'Save'"
              :disabled="!editForm.name || isSaving"
              :loading="isSaving"
              @click="handleSave"
            />
            <Button
              :label="$t('Archiv.delete') || 'Delete'"
              severity="danger"
              @click="handleDelete"
            />
          </div>
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useUser } from '@/stores/user'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import { fetcher } from '@/utils/fetcher'

interface InterviewSession {
  id: string
  tenantId: string
  fileId: string
  name: string
  description?: string
  meta?: {
    duration?: number
    transcriptionStatus?: 'pending' | 'processing' | 'completed' | 'error'
    elevenlabsTranscriptionId?: string
    transcriptionErrorMessage?: string
    speakerTypes?: Record<string, 'interviewee' | 'host'>
    mainCharacterId?: string // Speaker ID of the main character
    // Wiki processing fields
    wikiProcessed?: boolean
    wikiProcessedAt?: string
    wikiProcessedResult?: {
      processedFacts: number
      updatedCategories: string[]
      newCategories: string[]
    }
    // Knowledge embedding fields
    knowledgeEntryId?: string
    knowledgeEmbeddedAt?: string
    knowledgeGroupId?: string
  }
  transcript?: {
    language: string
    segments: Array<{
      text: string
      startTime: number
      endTime?: number
      speaker: {
        name: string
        id: string
      }
      words?: Array<{
        text: string
        startTime: number
        endTime?: number
      }>
    }>
  }
  createdAt: string
  updatedAt: string
}

const route = useRoute()
const userStore = useUser()
const toast = useToast()
const { t } = useI18n()

const tenantId = computed(() => route.params.tenantId as string || userStore.state.selectedTenant)

const actionMenuItems = computed(() => [
  {
    label: t('Archiv.downloadMarkdown') || 'Download Markdown',
    icon: 'pi pi-download',
    command: handleDownloadMarkdown,
  },
  {
    label: t('Archiv.analyzeSpeakers') || 'Analyze Speakers',
    icon: 'pi pi-users',
    command: handleAnalyzeSpeakers,
    disabled: isAnalyzing.value || !!editingSession.value?.meta?.speakerTypes,
  },
  {
    separator: true,
  },
  {
    label: t('Archiv.extractKnowledge') || 'Wissen extrahieren',
    icon: 'pi pi-book',
    command: handleExtractKnowledge,
    disabled: isExtractingKnowledge.value || !editingSession.value?.meta?.mainCharacterId,
  },
])

const sessions = ref<InterviewSession[]>([])
const loading = ref(false)
const showUploadDialog = ref(false)
const showEditDialog = ref(false)
const editingSession = ref<InterviewSession | null>(null)
const isUploading = ref(false)
const uploadProgress = ref(0)
const isSaving = ref(false)
const isAnalyzing = ref(false)
const isExtractingKnowledge = ref(false)
const isCreatingEmbedding = ref(false)
const refreshInterval = ref<number | null>(null)
const actionsMenu = ref<any>(null)

const uploadForm = ref({
  file: null as File | null,
  name: '',
  description: '',
})

const editForm = ref({
  name: '',
  description: '',
  mainCharacterId: null as string | null,
})

// Computed: Available speakers from transcript for selection
const availableSpeakers = computed(() => {
  if (!editingSession.value?.transcript?.segments) return []
  
  const speakersMap = new Map<string, { id: string; name: string }>()
  for (const segment of editingSession.value.transcript.segments) {
    if (!speakersMap.has(segment.speaker.id)) {
      speakersMap.set(segment.speaker.id, {
        id: segment.speaker.id,
        name: segment.speaker.name,
      })
    }
  }
  return Array.from(speakersMap.values())
})

const fetchSessions = async () => {
  if (!tenantId.value) return

  loading.value = true
  try {
    sessions.value = await fetcher.get<InterviewSession[]>(
      `/api/v1/tenant/${tenantId.value}/interview-sessions`
    )
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: t('error') || 'Error',
      detail: t('Archiv.fetchError') || 'Failed to load interview sessions',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

const handleFileSelect = (files: any) => {
  const firstFile = files && files.length > 0 ? files[0] : null
  uploadForm.value.file = firstFile as any

  // Auto-fill name from filename if name field is empty
  if (firstFile && !uploadForm.value.name) {
    // Remove file extension to get clean name
    const fileName = firstFile.name || ''
    const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, '')
    uploadForm.value.name = nameWithoutExtension
  }
}

const resetUploadForm = () => {
  uploadForm.value = {
    file: null,
    name: '',
    description: '',
  }
  uploadProgress.value = 0
}

const pollTranscriptionStatus = async (
  interviewSessionId: string,
  maxAttempts: number = 60 // Reduced to 60 attempts = 3 minutes max (instead of 10 minutes)
): Promise<InterviewSession> => {
  let attempts = 0
  const pollInterval = 3000 // Poll every 3 seconds in frontend

  while (attempts < maxAttempts) {
    const session = await fetcher.get<InterviewSession>(
      `/api/v1/tenant/${tenantId.value}/interview-transcription/${interviewSessionId}/status`
    )

    const status = session.meta?.transcriptionStatus

    if (status === 'completed' || status === 'error') {
      return session
    }

    // Update progress based on status
    if (status === 'processing') {
      uploadProgress.value = Math.min(50 + (attempts * 0.5), 95)
    } else {
      uploadProgress.value = 30 + (attempts * 0.2)
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval))
    attempts++
  }

  // Don't throw error - just return the current session state
  // The backend will continue processing, and the user can see it in the list
  const finalSession = await fetcher.get<InterviewSession>(
    `/api/v1/tenant/${tenantId.value}/interview-transcription/${interviewSessionId}/status`
  )
  
  return finalSession
}

const handleUpload = async () => {
  if (!uploadForm.value.file || !uploadForm.value.name || !tenantId.value) {
    return
  }

  isUploading.value = true
  uploadProgress.value = 10

  try {
    // Step 1: Upload file, create session, and start transcription
    uploadProgress.value = 20
    const formData = new FormData()
    formData.append('audio', uploadForm.value.file)
    formData.append('name', uploadForm.value.name)
    if (uploadForm.value.description) {
      formData.append('description', uploadForm.value.description)
    }

    const response = await fetcher.postFormData<{
      interviewSessionId: string
    }>(
      `/api/v1/tenant/${tenantId.value}/interview-transcription`,
      formData
    )

    uploadProgress.value = 30

    // Step 2: Poll transcription status (with timeout)
    const finalSession = await pollTranscriptionStatus(
      response.interviewSessionId
    )

    // Refresh list to show the session (even if still processing)
    await fetchSessions()

    if (finalSession.meta?.transcriptionStatus === 'error') {
      const errorMsg = finalSession.meta.transcriptionErrorMessage || 'Transcription failed'
      toast.add({
        severity: 'error',
        summary: t('error') || 'Error',
        detail: `Session ${response.interviewSessionId}: ${errorMsg}`,
        life: 5000,
      })
      showUploadDialog.value = false
      resetUploadForm()
      return
    }

    if (finalSession.meta?.transcriptionStatus === 'completed') {
      uploadProgress.value = 100
      toast.add({
        severity: 'success',
        summary: t('success') || 'Success',
        detail: t('Archiv.uploadSuccess') || 'Interview uploaded and transcribed successfully',
        life: 3000,
      })
      showUploadDialog.value = false
      resetUploadForm()
    } else {
      // Still processing - show info message and let user see it in the list
      uploadProgress.value = 95
      toast.add({
        severity: 'info',
        summary: t('info') || 'Info',
        detail: `Session ${response.interviewSessionId}: Transcription is still processing. You can see the progress in the list.`,
        life: 5000,
      })
      showUploadDialog.value = false
      resetUploadForm()
      
      // Start polling the list periodically to update status
      startPeriodicRefresh(response.interviewSessionId)
    }
  } catch (error: any) {
    console.error('Upload error:', error)
    toast.add({
      severity: 'error',
      summary: t('error') || 'Error',
      detail: error.message || (t('Archiv.uploadError') || 'Failed to upload interview'),
      life: 5000,
    })
  } finally {
    isUploading.value = false
    uploadProgress.value = 0
  }
}

const openEditDialog = (session: InterviewSession) => {
  editingSession.value = session
  editForm.value = {
    name: session.name,
    description: session.description || '',
    mainCharacterId: session.meta?.mainCharacterId || null,
  }
  showEditDialog.value = true
}

const handleSave = async () => {
  if (!editingSession.value || !tenantId.value) return

  isSaving.value = true
  try {
    // Check if mainCharacterId changed
    const currentMainCharacterId = editingSession.value.meta?.mainCharacterId || null
    const newMainCharacterId = editForm.value.mainCharacterId

    // Build update payload
    const updatePayload: {
      name: string
      description?: string
      meta?: { mainCharacterId?: string }
    } = {
      name: editForm.value.name,
      description: editForm.value.description || undefined,
    }

    // Include mainCharacterId in meta if it changed
    if (newMainCharacterId !== currentMainCharacterId) {
      updatePayload.meta = {
        mainCharacterId: newMainCharacterId || undefined,
      }
    }

    const updated = await fetcher.patch<InterviewSession>(
      `/api/v1/tenant/${tenantId.value}/interview-sessions/${editingSession.value.id}`,
      updatePayload
    )

    // Update local state
    const index = sessions.value.findIndex((s) => s.id === editingSession.value!.id)
    if (index !== -1) {
      sessions.value[index] = updated
    }

    toast.add({
      severity: 'success',
      summary: t('success') || 'Success',
      detail: t('Archiv.saveSuccess') || 'Interview session updated successfully',
      life: 3000,
    })

    showEditDialog.value = false
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: t('error') || 'Error',
      detail: error.message || (t('Archiv.saveError') || 'Failed to save interview session'),
      life: 3000,
    })
  } finally {
    isSaving.value = false
  }
}

const handleDelete = async () => {
  if (!editingSession.value || !tenantId.value) return

  try {
    await fetcher.delete(
      `/api/v1/tenant/${tenantId.value}/interview-sessions/${editingSession.value.id}`
    )

    // Remove from local state
    sessions.value = sessions.value.filter((s) => s.id !== editingSession.value!.id)

    toast.add({
      severity: 'success',
      summary: t('success') || 'Success',
      detail: t('Archiv.deleteSuccess') || 'Interview session deleted successfully',
      life: 3000,
    })

    showEditDialog.value = false
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: t('error') || 'Error',
      detail: error.message || (t('Archiv.deleteError') || 'Failed to delete interview session'),
      life: 3000,
    })
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const getMainCharacterName = (session: InterviewSession) => {
  if (!session.meta?.mainCharacterId || !session.transcript?.segments) return ''
  const segment = session.transcript.segments.find(s => s.speaker.id === session.meta?.mainCharacterId)
  return segment?.speaker.name || `Speaker ${session.meta.mainCharacterId}`
}

const toggleActionsMenu = (event: Event) => {
  actionsMenu.value?.toggle(event)
}

const startPeriodicRefresh = (sessionId: string) => {
  // Clear any existing interval
  if (refreshInterval.value !== null) {
    clearInterval(refreshInterval.value)
  }

  // Refresh every 10 seconds until session is completed or error
  refreshInterval.value = window.setInterval(async () => {
    await fetchSessions()

    // Check if session is done
    const session = sessions.value.find(s => s.id === sessionId)
    if (session && (session.meta?.transcriptionStatus === 'completed' || session.meta?.transcriptionStatus === 'error')) {
      if (refreshInterval.value !== null) {
        clearInterval(refreshInterval.value)
        refreshInterval.value = null
      }
    }
  }, 10000) // Every 10 seconds
}

const handleDownloadMarkdown = async () => {
  if (!editingSession.value || !tenantId.value) return

  if (!editingSession.value.transcript) {
    toast.add({
      severity: 'warn',
      summary: t('warning') || 'Warning',
      detail: t('Archiv.noTranscript') || 'No transcript available',
      life: 3000,
    })
    return
  }

  try {
    const response = await fetch(
      `/api/v1/tenant/${tenantId.value}/interview-sessions/${editingSession.value.id}/markdown`
    )

    if (!response.ok) {
      throw new Error('Failed to download markdown')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${editingSession.value.name.replace(/[^a-z0-9_-]/gi, '_')}.txt`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    toast.add({
      severity: 'success',
      summary: t('success') || 'Success',
      detail: t('Archiv.downloadSuccess') || 'Markdown downloaded successfully',
      life: 3000,
    })
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: t('error') || 'Error',
      detail: error.message || (t('Archiv.downloadError') || 'Failed to download markdown'),
      life: 3000,
    })
  }
}

const handleAnalyzeSpeakers = async () => {
  if (!editingSession.value || !tenantId.value) return

  if (!editingSession.value.transcript) {
    toast.add({
      severity: 'warn',
      summary: t('warning') || 'Warning',
      detail: t('Archiv.noTranscript') || 'No transcript available',
      life: 3000,
    })
    return
  }

  isAnalyzing.value = true
  try {
    const result = await fetcher.post<{
      speakerTypes: Record<string, 'interviewee' | 'host'>
      reasoning?: string
    }>(
      `/api/v1/tenant/${tenantId.value}/interview-sessions/${editingSession.value.id}/analyze-speakers`,
      {}
    )

    // Update local state
    const index = sessions.value.findIndex((s) => s.id === editingSession.value!.id)
    if (index !== -1 && sessions.value[index]) {
      const session = sessions.value[index]
      if (!session.meta) {
        session.meta = {}
      }
      session.meta.speakerTypes = result.speakerTypes
    }
    if (editingSession.value) {
      if (!editingSession.value.meta) {
        editingSession.value.meta = {}
      }
      editingSession.value.meta.speakerTypes = result.speakerTypes
    }

    toast.add({
      severity: 'success',
      summary: t('success') || 'Success',
      detail: t('Archiv.analyzeSuccess') || 'Speaker types analyzed successfully',
      life: 3000,
    })
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: t('error') || 'Error',
      detail: error.message || (t('Archiv.analyzeError') || 'Failed to analyze speaker types'),
      life: 3000,
    })
  } finally {
    isAnalyzing.value = false
  }
}

const handleCreateEmbedding = async () => {
  if (!editingSession.value || !tenantId.value) return

  if (!editingSession.value.transcript) {
    toast.add({
      severity: 'warn',
      summary: t('warning') || 'Warnung',
      detail: t('Archiv.noTranscript') || 'Kein Transkript vorhanden',
      life: 3000,
    })
    return
  }

  isCreatingEmbedding.value = true
  try {
    const result = await fetcher.post<{
      success: boolean
      knowledgeEntryId?: string
      knowledgeGroupId?: string
      error?: string
    }>(
      `/api/v1/tenant/${tenantId.value}/interview-sessions/${editingSession.value.id}/create-embedding`,
      {}
    )

    if (result.success) {
      // Update local state
      const index = sessions.value.findIndex((s) => s.id === editingSession.value!.id)
      if (index !== -1 && sessions.value[index]) {
        const session = sessions.value[index]
        if (!session.meta) {
          session.meta = {}
        }
        session.meta.knowledgeEntryId = result.knowledgeEntryId
        session.meta.knowledgeGroupId = result.knowledgeGroupId
        session.meta.knowledgeEmbeddedAt = new Date().toISOString()
      }
      if (editingSession.value) {
        if (!editingSession.value.meta) {
          editingSession.value.meta = {}
        }
        editingSession.value.meta.knowledgeEntryId = result.knowledgeEntryId
        editingSession.value.meta.knowledgeGroupId = result.knowledgeGroupId
        editingSession.value.meta.knowledgeEmbeddedAt = new Date().toISOString()
      }

      toast.add({
        severity: 'success',
        summary: t('success') || 'Erfolg',
        detail: t('Archiv.embeddingSuccess') || 'Interview wurde für Chat-Suche aktiviert',
        life: 3000,
      })
    } else {
      toast.add({
        severity: 'error',
        summary: t('error') || 'Fehler',
        detail: result.error || t('Archiv.embeddingError') || 'Fehler beim Erstellen des Embeddings',
        life: 5000,
      })
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: t('error') || 'Fehler',
      detail: error.message || (t('Archiv.embeddingError') || 'Fehler beim Erstellen des Embeddings'),
      life: 5000,
    })
  } finally {
    isCreatingEmbedding.value = false
  }
}

const handleExtractKnowledge = async () => {
  if (!editingSession.value || !tenantId.value) return

  if (!editingSession.value.transcript) {
    toast.add({
      severity: 'warn',
      summary: t('warning') || 'Warnung',
      detail: t('Archiv.noTranscript') || 'Kein Transkript vorhanden',
      life: 3000,
    })
    return
  }

  if (!editingSession.value.meta?.mainCharacterId) {
    toast.add({
      severity: 'warn',
      summary: t('warning') || 'Warnung',
      detail: t('Archiv.noMainCharacter') || 'Bitte zuerst die Hauptperson auswählen',
      life: 3000,
    })
    return
  }

  isExtractingKnowledge.value = true
  try {
    const result = await fetcher.post<{
      success: boolean
      processedFacts: number
      updatedCategories: string[]
      newCategories: string[]
      errors: string[]
      interviewEntryId?: string
    }>(
      `/api/v1/tenant/${tenantId.value}/interview-sessions/${editingSession.value.id}/process-wiki`,
      {}
    )

    // Update local state
    const index = sessions.value.findIndex((s) => s.id === editingSession.value!.id)
    if (index !== -1 && sessions.value[index]) {
      const session = sessions.value[index]
      if (!session.meta) {
        session.meta = {}
      }
      session.meta.wikiProcessed = true
      session.meta.wikiProcessedAt = new Date().toISOString()
      session.meta.wikiProcessedResult = {
        processedFacts: result.processedFacts,
        updatedCategories: result.updatedCategories,
        newCategories: result.newCategories,
      }
    }
    if (editingSession.value) {
      if (!editingSession.value.meta) {
        editingSession.value.meta = {}
      }
      editingSession.value.meta.wikiProcessed = true
      editingSession.value.meta.wikiProcessedAt = new Date().toISOString()
      editingSession.value.meta.wikiProcessedResult = {
        processedFacts: result.processedFacts,
        updatedCategories: result.updatedCategories,
        newCategories: result.newCategories,
      }
    }

    if (result.success) {
      toast.add({
        severity: 'success',
        summary: t('success') || 'Erfolg',
        detail: t('Archiv.extractSuccess', { facts: result.processedFacts, updated: result.updatedCategories.length, new: result.newCategories.length }) 
          || `${result.processedFacts} Informationen extrahiert. ${result.updatedCategories.length} Kategorien aktualisiert, ${result.newCategories.length} neue Kategorien erstellt.`,
        life: 5000,
      })

      // Show warnings if any errors
      if (result.errors && result.errors.length > 0) {
        toast.add({
          severity: 'warn',
          summary: t('warning') || 'Warnung',
          detail: result.errors.join(', '),
          life: 5000,
        })
      }
    } else {
      toast.add({
        severity: 'error',
        summary: t('error') || 'Fehler',
        detail: result.errors?.join(', ') || t('Archiv.extractError') || 'Fehler beim Extrahieren',
        life: 5000,
      })
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: t('error') || 'Fehler',
      detail: error.message || (t('Archiv.extractError') || 'Fehler beim Extrahieren des Wissens'),
      life: 5000,
    })
  } finally {
    isExtractingKnowledge.value = false
  }
}

onMounted(() => {
  fetchSessions()
})

// Cleanup interval on unmount
onUnmounted(() => {
  if (refreshInterval.value !== null) {
    clearInterval(refreshInterval.value)
  }
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
