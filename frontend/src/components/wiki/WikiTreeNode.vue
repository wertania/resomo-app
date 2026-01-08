<template>
  <li class="wiki-tree-node">
    <div
      :class="[
        'group flex items-center gap-1 rounded px-2 py-1.5 transition-colors cursor-pointer',
        isSelected
          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
          : 'text-surface-700 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-700/50',
      ]"
      @click="$emit('select', item.id)"
    >
      <!-- Expand/Collapse Button -->
      <button
        v-if="hasChildren"
        @click.stop="toggleExpand"
        class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded hover:bg-surface-200 dark:hover:bg-surface-600"
      >
        <IconChevronRight
          :class="[
            'h-4 w-4 transition-transform',
            isExpanded ? 'rotate-90' : '',
          ]"
        />
      </button>
      <div v-else class="w-5 flex-shrink-0" />

      <!-- Item Icon -->
      <IconDocument class="h-4 w-4 flex-shrink-0 opacity-70" />

      <!-- Item Title -->
      <div class="min-w-0 flex-1 truncate text-sm font-medium">
        {{ item.title || 'Untitled' }}
      </div>

      <!-- Actions -->
      <div
        class="flex flex-shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <Button
          text
          size="small"
          severity="secondary"
          class="h-6 w-6 p-0"
          @click.stop="handleAddChild"
          :title="$t('Wiki.addChild') || 'Add child'"
        >
          <IconAdd class="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>

    <!-- Children -->
    <ul
      v-if="hasChildren && isExpanded"
      class="m-0 ml-4 list-none space-y-1 border-l border-surface-200 p-0 pl-2 pt-1 dark:border-surface-700"
    >
      <WikiTreeNode
        v-for="child in item.children"
        :key="child.id"
        :item="child"
        :selected-id="selectedId"
        @select="$emit('select', $event)"
        @add-child="$emit('add-child', $event)"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
      />
    </ul>
  </li>
</template>

<script setup lang="ts">
import type { KnowledgeText } from '@/stores/knowledgeTexts'
import IconChevronRight from '~icons/mdi/chevron-right'
import IconDocument from '~icons/mdi/file-document-outline'
import IconAdd from '~icons/mdi/plus'

const props = defineProps<{
  item: KnowledgeText
  selectedId: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
  'add-child': [parentId: string]
  edit: [id: string]
  delete: [id: string]
}>()

const isExpanded = ref(true)

const hasChildren = computed(() => {
  return props.item.children && props.item.children.length > 0
})

const isSelected = computed(() => {
  return props.selectedId === props.item.id
})

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

const handleAddChild = () => {
  emit('add-child', props.item.id)
}
</script>
