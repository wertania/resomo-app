<template>
  <div class="h-full">
    <!-- Knowledge Manage -->
    <KnowledgeManage
      :show-toolbar="true"
      :show-manage-fields="!simpleMode"
      :entries="entries"
      :loading="loading"
      :error="error"
      :selectedGroup="selectedGroup"
    />
  </div>

  <!-- Dialog for displaying knowledge entry details -->
  <KnowledgeDetails />
</template>

<script setup lang="ts">
import type { KnowledgeEntry } from '@/types/knowledge'
import type { KnowledgeGroup } from '@/types/knowledgeGroup'

// props
const {
  simpleMode = false,
  entries = [],
  loading = false,
  error = null,
  selectedGroup = null,
  visible = false,
} = defineProps<{
  simpleMode?: boolean
  entries: KnowledgeEntry[]
  loading?: boolean
  error?: string | null
  selectedGroup?: KnowledgeGroup | null
  visible?: boolean
}>()

defineEmits<{
  (e: 'add'): void
  (e: 'edit', entry: KnowledgeEntry): void
  (e: 'delete', entry: KnowledgeEntry): void
  (e: 'update:visible', value: boolean): void
}>()
</script>

