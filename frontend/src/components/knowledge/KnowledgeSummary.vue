<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-2">
      <div class="flex flex-col gap-2">
        <label
          for="name"
          class="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {{ $t('Knowledge.manage.name') }}
        </label>
        <InputText id="name" v-model="localInputs.name" class="w-full" />
      </div>

      <label
        for="abstract"
        class="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {{ $t('Knowledge.manage.abstract') }}
      </label>
      <InputText id="abstract" v-model="localInputs.abstract" class="w-full" />
    </div>

    <div class="flex flex-col gap-2">
      <label
        for="description"
        class="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {{ $t('Knowledge.manage.description') }}
      </label>
      <Textarea
        id="description"
        v-model="localInputs.description"
        auto-resize
        class="w-full"
      />
    </div>
    <div class="flex justify-end gap-4">
      <Button
        :label="$t('Common.cancel')"
        @click="handleCancel"
        class="p-button-secondary"
      />
      <Button
        :label="$t('Common.save')"
        @click="save"
        :loading="saving"
      />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { useKnowledgeBaseStore } from '@/stores/knowledgeBase'
import { useApp } from '@/stores/main'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import { fetcher } from '@/utils/fetcher'

const toast = useToast()
const { t } = useI18n()
const appStore = useApp()
const knowledgeStore = useKnowledgeBaseStore()

// Emit event to close the dialog
const emit = defineEmits(['close'])

const localInputs = ref<{
  abstract: string | null
  description: string | null
  name: string | null
}>({
  abstract: knowledgeStore.selectedEntry?.entry.abstract || null,
  description: knowledgeStore.selectedEntry?.entry.description || null,
  name: knowledgeStore.selectedEntry?.entry.name || null,
})
const saving = ref(false)

const handleCancel = () => {
  localInputs.value = {
    abstract: knowledgeStore.selectedEntry?.entry.abstract || null,
    description: knowledgeStore.selectedEntry?.entry.description || null,
    name: knowledgeStore.selectedEntry?.entry.name || null,
  }
  emit('close')
}

const save = async () => {
  if (!appStore.state.selectedTenant || !knowledgeStore.selectedEntry?.entry.id)
    return

  saving.value = true

  try {
    await fetcher.put(
      `/api/v1/tenant/${appStore.state.selectedTenant}/knowledge/entries/${knowledgeStore.selectedEntry.entry.id}`,
      {
        abstract: localInputs.value.abstract?.trim(),
        description: localInputs.value.description?.trim(),
        name: localInputs.value.name?.trim(),
      },
    )

    toast.add({
      severity: 'success',
      summary: t('Common.success'),
      detail: t('Knowledge.manage.summaryUpdated'),
      life: 3000,
    })
    knowledgeStore.showDetailsDialog = false
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: t('Common.error'),
      detail: error.message,
      life: 3000,
    })
  } finally {
    saving.value = false
  }
}

// Watch for changes in selectedEntry
watch(
  () => knowledgeStore.selectedEntry,
  (newEntry) => {
    if (newEntry) {
      localInputs.value = {
        abstract: newEntry.entry.abstract || null,
        description: newEntry.entry.description || null,
        name: newEntry.entry.name || null,
      }
    }
  },
  { immediate: true },
)
</script>

