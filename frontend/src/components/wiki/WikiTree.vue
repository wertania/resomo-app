<template>
  <div class="w-full">
    <ul v-if="items.length > 0" class="m-0 list-none space-y-1 p-0">
      <WikiTreeNode
        v-for="item in items"
        :key="item.id"
        :item="item"
        :selected-id="selectedId"
        @select="$emit('select', $event)"
        @add-child="$emit('add-child', $event)"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
      />
    </ul>
    <div
      v-else
      class="py-8 text-center text-sm text-surface-400 dark:text-surface-500"
    >
      {{ $t('Wiki.noEntries') || 'No entries yet' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { KnowledgeText } from '@/stores/knowledgeTexts'
import WikiTreeNode from './WikiTreeNode.vue'

defineProps<{
  items: KnowledgeText[]
  selectedId: string | null
}>()

defineEmits<{
  select: [id: string]
  'add-child': [parentId: string]
  edit: [id: string]
  delete: [id: string]
}>()
</script>
