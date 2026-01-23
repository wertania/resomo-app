<template>
  <div class="space-y-4">
    <!-- Info Message -->
    <div class="rounded-md bg-surface-100 p-3 text-sm text-surface-600 dark:bg-surface-800 dark:text-surface-400">
      {{ $t('Knowledge.manage.tenantWideInfo') }}
    </div>

    <!-- Knowledge Group Assignment -->
    <div class="flex flex-col gap-2">
      <label
        for="knowledgeGroupId"
        class="text-sm font-medium dark:text-gray-300"
      >
        {{ $t('Knowledge.manage.assignToKnowledgeGroup') }}
      </label>
      <Select
        id="knowledgeGroupId"
        v-model="knowledgeGroupId"
        :options="knowledgeGroups"
        optionLabel="name"
        optionValue="id"
        :placeholder="$t('Knowledge.manage.selectKnowledgeGroup')"
        class="w-full"
        :showClear="true"
      />
      <small class="text-surface-500 dark:text-surface-400">
        {{ $t('Knowledge.manage.optionalGroupAssignment') }}
      </small>
    </div>

    <div class="flex justify-end gap-4">
      <Button
        :label="$t('Common.cancel')"
        @click="resetForm"
        class="p-button-secondary"
      />
      <Button
        :label="$t('Common.save')"
        @click="saveChanges"
        :loading="saving"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { KnowledgeEntry } from '@/types/knowledge'
import { useKnowledgeGroupsStore } from '@/stores/knowledgeGroups'
import { useKnowledgeBaseStore } from '@/stores/knowledgeBase'
import { useUser } from '@/stores/user'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { fetcher } from '@/utils/fetcher'

const props = defineProps<{
  entry: KnowledgeEntry
}>()

const emit = defineEmits<{
  (e: 'update:assignments'): void
  (e: 'close'): void
}>()

const userStore = useUser()
const toast = useToast()
const { t } = useI18n()
const knowledgeGroupsStore = useKnowledgeGroupsStore()
const knowledgeBaseStore = useKnowledgeBaseStore()
const route = useRoute()

// Form state - userOwned and teamId are always false/null (tenant-wide only)
const knowledgeGroupId = ref(props.entry.knowledgeGroup?.id || null)
const saving = ref(false)

// Fetch knowledge groups if not already loaded
const knowledgeGroups = computed(() => {
  return knowledgeGroupsStore.plainGroups
})

onMounted(async () => {
  if (knowledgeGroups.value.length === 0 && userStore.state.selectedTenant) {
    await knowledgeGroupsStore.fetchGroups(userStore.state.selectedTenant)
  }
})


// Reset the form to initial values
const resetForm = () => {
  knowledgeGroupId.value = props.entry.knowledgeGroup?.id || null
  emit('close')
}

// Save the changes using the API
const saveChanges = async () => {
  if (!userStore.state.selectedTenant) return

  saving.value = true
  try {
    // Always set userOwned to false and teamId to null (tenant-wide only)
    await fetcher.put(
      `/api/v1/tenant/${userStore.state.selectedTenant}/knowledge/entries/${props.entry.id}`,
      {
        userOwned: false,
        teamId: null,
        knowledgeGroupId: knowledgeGroupId.value,
      },
    )

    toast.add({
      severity: 'success',
      summary: t('Common.success'),
      detail: t('Knowledge.manage.assignmentUpdateSuccess'),
      life: 3000,
    })

    // Reload entries list with current group filter
    const currentGroupId = route.params.groupId as string
    await knowledgeBaseStore.fetchEntries(userStore.state.selectedTenant, {
      knowledgeGroupId: currentGroupId || undefined,
    })

    emit('update:assignments')
  } catch (error) {
    console.error('Error updating knowledge entry assignments:', error)
    toast.add({
      severity: 'error',
      summary: t('Common.error'),
      detail: t('Knowledge.manage.assignmentUpdateError'),
      life: 3000,
    })
  } finally {
    saving.value = false
  }
}

// Initialize form when props change
watch(
  () => props.entry,
  (newEntry) => {
    knowledgeGroupId.value = newEntry.knowledgeGroup?.id || null
  },
  { immediate: true },
)
</script>

