<template>
  <li
    class="group relative flex items-center gap-4 rounded-lg border border-surface-200 bg-white p-4 transition-all duration-200 hover:border-surface-300 hover:shadow-md dark:border-surface-700 dark:bg-surface-800 dark:hover:border-surface-600"
  >
    <!-- Checkbox for multiple selection -->
    <div class="flex-none">
      <Checkbox
        v-model="isSelected"
        @change="$emit('selection-change', entry.id)"
        :binary="true"
        class="transition-opacity duration-200"
      />
    </div>

    <!-- Main content -->
    <div class="min-w-0 flex-1">
      <!-- Title row -->
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <h3
            class="text-base font-semibold text-surface-900 dark:text-surface-50"
          >
            <slot name="header"></slot>
          </h3>
          <!-- Description if available -->
          <p
            v-if="entry.description"
            class="mt-1 line-clamp-2 text-sm text-surface-600 dark:text-surface-400"
          >
            {{ entry.description }}
          </p>
        </div>
      </div>

      <!-- Metadata row -->
      <div class="mt-3 flex flex-wrap items-center gap-4 text-sm text-surface-500 dark:text-surface-400">
        <!-- Updated date -->
        <div class="flex items-center gap-1.5">
          <IconFluentClock24Regular class="size-4" />
          <span>
            {{ $t('Knowledge.manage.updated') }}:
            {{ formatDate(entry.updatedAt) }}
          </span>
        </div>

        <!-- Assignment badges -->
        <div class="flex items-center gap-2">
          <Chip
            v-if="entry.userOwned"
            class="h-6 gap-1.5 px-2 text-xs"
            severity="info"
          >
            <IconFluentPerson24Regular class="size-3.5" />
            <span>{{ $t('Knowledge.entry.onlyMe') }}</span>
          </Chip>

          <Chip
            v-if="entry.teamId"
            class="h-6 gap-1.5 px-2 text-xs"
            severity="secondary"
          >
            <IconFluentPeopleTeam24Regular class="size-3.5" />
            <span>{{
              userStore.state.teams?.find((team) => team.id === entry.teamId)
                ?.name || $t('Knowledge.entry.team')
            }}</span>
          </Chip>

          <Chip
            v-if="entry.knowledgeGroup"
            class="h-6 gap-1.5 px-2 text-xs"
            severity="success"
          >
            <IconFluentFolder24Regular class="size-3.5" />
            <span>{{ entry.knowledgeGroup.name }}</span>
          </Chip>
        </div>
      </div>
    </div>

    <!-- Actions (shown on hover on desktop, always visible on mobile) -->
    <div
      class="flex flex-none items-center gap-1 opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100"
    >
      <slot name="actions"></slot>
    </div>
  </li>
</template>

<script setup lang="ts">
import IconFluentPerson24Regular from '~icons/line-md/account'
import IconFluentPeopleTeam24Regular from '~icons/line-md/account-small'
import IconFluentClock24Regular from '~icons/line-md/calendar'
import IconFluentFolder24Regular from '~icons/line-md/folder'
import type { KnowledgeEntry } from '@/types/knowledge'
import { useUser } from '@/stores/user'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ entry: KnowledgeEntry; modelValue?: boolean }>()
const userStore = useUser()
const { t, d } = useI18n()

const emit = defineEmits(['selection-change', 'update:modelValue'])

const isSelected = ref(false)

// Format date nicely
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    const hours = Math.floor(diffTime / (1000 * 60 * 60))
    if (hours === 0) {
      const minutes = Math.floor(diffTime / (1000 * 60))
      return minutes <= 1 ? t('Common.justNow') : t('Common.minutesAgo', { count: minutes })
    }
    return t('Common.hoursAgo', { count: hours })
  } else if (diffDays === 1) {
    return t('Common.yesterday')
  } else if (diffDays < 7) {
    return t('Common.daysAgo', { count: diffDays })
  } else {
    return d(date, 'short')
  }
}

// Watch external changes
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== undefined) {
      isSelected.value = newValue
    }
  },
)

// Watch internal changes
watch(isSelected, (newValue) => {
  emit('update:modelValue', newValue)
})
</script>

