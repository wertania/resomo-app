<template>
  <div class="p-6">
    <AppHeader>
      <template #actions>
        <Button
          @click="showAddDialog = true"
          class="size-10 p-0"
          text
          raised
          v-tooltip.bottom="$t('Common.add')"
        >
          <template #icon>
            <FluentAdd />
          </template>
        </Button>
      </template>
    </AppHeader>

    <div class="mx-auto max-w-7xl p-4">
      <div v-if="loading" class="flex justify-center p-10">
        <ProgressSpinner />
      </div>

      <div v-else-if="error" class="flex justify-center p-10">
        <Message severity="error" :closable="false">{{
          $t('Knowledge.groups.error.loading')
        }}</Message>
      </div>

      <div v-else>
        <div v-if="groups.length === 0" class="py-16 text-center">
          <div
            class="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-700"
          >
            <IconFluentFolder24Regular
              class="size-8 text-surface-400 dark:text-surface-500"
            />
          </div>
          <p
            class="text-base font-medium text-surface-700 dark:text-surface-300"
          >
            {{ $t('Knowledge.groups.noGroupsFound') }}
          </p>
          <p class="mt-1 text-sm text-surface-500 dark:text-surface-400">
            {{ $t('Knowledge.groups.addFirstGroup') }}
          </p>
        </div>

        <ul v-else class="space-y-4">
          <li
            v-for="group in groups"
            :key="group.id"
            class="group relative flex items-center gap-4 rounded-lg border border-surface-200 bg-white p-4 transition-all duration-200 hover:border-surface-300 hover:shadow-md dark:border-surface-700 dark:bg-surface-800 dark:hover:border-surface-600 cursor-pointer"
            @click="navigateToGroup(group)"
          >
            <!-- Icon -->
            <div class="flex-none">
              <div
                class="flex size-10 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20"
              >
                <IconFluentFolder24Regular
                  class="size-5 text-primary-600 dark:text-primary-400"
                />
              </div>
            </div>

            <!-- Main content -->
            <div class="min-w-0 flex-1">
              <!-- Title row -->
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <h3
                    class="text-base font-semibold text-surface-900 dark:text-surface-50"
                  >
                    {{ group.name }}
                  </h3>
                  <!-- Description if available -->
                  <p
                    v-if="group.description"
                    class="mt-1 line-clamp-2 text-sm text-surface-600 dark:text-surface-400"
                  >
                    {{ group.description }}
                  </p>
                </div>
              </div>

              <!-- Metadata row -->
              <div
                class="mt-3 flex flex-wrap items-center gap-4 text-sm text-surface-500 dark:text-surface-400"
              >
                <!-- Organisation Wide Badge - Always shown since tenantWideAccess is always enabled -->
                <Chip class="h-6 gap-1.5 px-2 text-xs" severity="info">
                  <IconFaSolidGlobe class="size-3.5" />
                  <span>{{ $t('Knowledge.groups.organisationWide') }}</span>
                </Chip>
              </div>
            </div>

            <!-- Actions (shown on hover) -->
            <div
              class="flex flex-none items-center gap-1 opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100"
              @click.stop
            >
              <Button
                v-if="group.id !== ''"
                v-tooltip.bottom="$t('Common.edit')"
                size="small"
                severity="secondary"
                text
                rounded
                @click.stop="editGroup(group)"
              >
                <FluentEdit class="size-4" />
              </Button>
              <Button
                v-if="group.id !== ''"
                v-tooltip.bottom="$t('Common.delete')"
                size="small"
                severity="danger"
                text
                rounded
                @click.stop="confirmDelete(group)"
              >
                <FluentDelete class="size-4" />
              </Button>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>

  <!-- Add/Edit Dialog -->
  <Dialog
    v-model:visible="showAddDialog"
    :header="
      editingGroup ? $t('Knowledge.groups.edit') : $t('Knowledge.groups.add')
    "
    modal
    class="w-[95%] !max-w-[800px]"
  >
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <label for="name">{{ $t('Common.name') }}</label>
        <InputText
          id="name"
          v-model="groupForm.name"
          :class="{ 'p-invalid': errors.name }"
        />
        <small v-if="errors.name">{{ errors.name }}</small>
      </div>

      <div class="flex flex-col gap-2">
        <label for="description">{{ $t('Common.description') }}</label>
        <Textarea id="description" v-model="groupForm.description" rows="3" />
      </div>

      <!-- Organisation Wide Access is always enabled -->
      <div
        class="flex items-center gap-2 rounded-md bg-surface-100 p-3 dark:bg-surface-800"
      >
        <Checkbox
          id="organisationWide"
          :model-value="true"
          :binary="true"
          disabled
        />
        <label
          for="organisationWide"
          class="text-sm text-surface-600 dark:text-surface-400"
          >{{ $t('Knowledge.groups.organisationWide') }}</label
        >
      </div>
    </div>

    <template #footer>
      <Button :label="$t('Common.cancel')" text @click="closeDialog">
        <template #icon>
          <FluentDismiss />
        </template>
      </Button>
      <Button :label="$t('Common.save')" @click="saveGroup" :loading="saving">
        <template #icon>
          <FluentCheckmark />
        </template>
      </Button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useKnowledgeGroupsStore } from '@/stores/knowledgeGroups'
import { useApp } from '@/stores/main'
import FluentAdd from '~icons/mdi/plus'
import FluentEdit from '~icons/mdi/pencil'
import FluentDelete from '~icons/mdi/delete'
import FluentDismiss from '~icons/mdi/close'
import FluentCheckmark from '~icons/mdi/check'
import IconFaSolidGlobe from '~icons/fa-solid/globe'
import IconFluentFolder24Regular from '~icons/mdi/folder-outline'
import type { KnowledgeGroup } from '@/types/knowledgeGroup'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { fetcher } from '@/utils/fetcher'
import { storeToRefs } from 'pinia'

const router = useRouter()
const route = useRoute()
const knowledgeGroupsStore = useKnowledgeGroupsStore()
const { groups, loading, error } = storeToRefs(knowledgeGroupsStore)
const { fetchGroups, createGroup, updateGroup, deleteGroup } =
  knowledgeGroupsStore

const { t } = useI18n()
const appStore = useApp()
const toast = useToast()
const confirm = useConfirm()

const showAddDialog = ref(false)
const saving = ref(false)
const errors = ref({ name: '' })
const editingGroup = ref<KnowledgeGroup | null>(null)
const groupForm = ref({
  name: '',
  description: '',
  organisationWideAccess: true, // Always enabled
  organisationId: appStore.state.selectedTenant,
  userId: appStore.state.user?.id!,
})

onMounted(() => {
  const tenantId = route.params.tenantId as string
  fetchGroups(tenantId)
})

const closeDialog = () => {
  showAddDialog.value = false
  editingGroup.value = null
  groupForm.value = {
    name: '',
    description: '',
    organisationWideAccess: true, // Always enabled
    organisationId: appStore.state.selectedTenant,
    userId: appStore.state.user?.id!,
  }
  errors.value = { name: '' }
}

const editGroup = async (group: KnowledgeGroup) => {
  showAddDialog.value = true
  editingGroup.value = group

  groupForm.value = {
    name: group.name,
    description: group.description || '',
    organisationWideAccess: true, // Always enabled - force to true even if group has false
    organisationId: group.tenantId,
    userId: group.userId,
  }
}

const saveGroup = async () => {
  errors.value = { name: '' }

  if (!groupForm.value.name.trim()) {
    errors.value.name = t('Common.required')
    return
  }

  saving.value = true
  try {
    const tenantId = route.params.tenantId as string
    // Update with current tenant
    groupForm.value.organisationId = tenantId

    // Ensure tenantWideAccess is always true
    // Map organisationWideAccess to tenantWideAccess for API
    const groupData = {
      name: groupForm.value.name,
      description: groupForm.value.description,
      tenantWideAccess: true, // Always enabled - use backend key name
      tenantId: groupForm.value.organisationId,
    }

    if (editingGroup.value) {
      await updateGroup(tenantId, editingGroup.value.id, groupData as any)
    } else {
      await createGroup(tenantId, {
        ...groupData,
        userId: groupForm.value.userId,
      } as any)
    }
    closeDialog()
  } catch (error) {
    console.error('Failed to save group:', error)
  } finally {
    saving.value = false
  }
}

const confirmDelete = async (group: KnowledgeGroup) => {
  confirm.require({
    message: t('Knowledge.groups.confirmDelete'),
    header: t('Common.delete'),
    rejectProps: {
      label: t('Common.cancel'),
      severity: 'secondary',
      outlined: true,
    },
    acceptProps: {
      label: t('Common.yes'),
    },
    accept: async () => {
      console.log('Deleting group:', group)
      try {
        const tenantId = route.params.tenantId as string
        await deleteGroup(tenantId, group.id)
      } catch (error) {
        console.error('Failed to delete group:', error)
        toast.add({
          severity: 'error',
          summary: t('Knowledge.groups.error.deleting'),
          life: 5000,
        })
      }
    },
  })
}

const navigateToGroup = (group: KnowledgeGroup) => {
  const tenantId = route.params.tenantId as string
  // Handle "No Assignment" group (empty id) with special value
  const groupId = group.id === '' ? 'null' : group.id
  router.push({
    name: 'ManageKnowledgeDetails',
    params: { tenantId, groupId },
  })
}
</script>
