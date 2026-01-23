<template>
  <li class="wiki-tree-node">
    <div
      :class="[
        'group flex items-center gap-1 rounded px-2 py-1.5 transition-colors cursor-move',
        isSelected
          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
          : 'text-surface-700 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-700/50',
        isDragOver && 'bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-400',
      ]"
      draggable="true"
      @click="$emit('select', item.id)"
      @dragstart="handleDragStart"
      @dragend="handleDragEnd"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
      @drop.prevent="handleDrop"
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
        class="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <Button
          text
          size="small"
          severity="secondary"
          class="h-8 w-8 p-0"
          @click.stop="handleAddChild"
          :title="$t('Wiki.addChild') || 'Add child'"
        >
          <IconAdd class="h-5 w-5" />
        </Button>
        <Button
          text
          size="small"
          severity="secondary"
          class="h-8 w-8 p-0"
          @click.stop="handleMoveToRoot"
          :title="$t('Wiki.moveToRoot') || 'Move to root'"
        >
          <IconHome class="h-5 w-5" />
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
        :is-tenant-wide="isTenantWide"
        @select="$emit('select', $event)"
        @add-child="$emit('add-child', $event)"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
        @move="$emit('move', $event)"
      />
    </ul>
  </li>
</template>

<script setup lang="ts">
import type { KnowledgeText } from '@/stores/knowledgeTexts'
import IconChevronRight from '~icons/line-md/chevron-right'
import IconDocument from '~icons/line-md/file-document'
import IconAdd from '~icons/line-md/plus'
import IconHome from '~icons/line-md/home'

const props = defineProps<{
  item: KnowledgeText
  selectedId: string | null
  isTenantWide?: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  'add-child': [parentId: string]
  edit: [id: string]
  delete: [id: string]
  move: [data: { itemId: string; newParentId: string | null; targetTenantWide: boolean }]
}>()

const isExpanded = ref(true)
const isDragOver = ref(false)

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

const handleMoveToRoot = () => {
  emit('move', { 
    itemId: props.item.id, 
    newParentId: null,
    targetTenantWide: props.isTenantWide ?? props.item.tenantWide
  })
}

// Drag and Drop handlers
let draggedItemId: string | null = null

const handleDragStart = (event: DragEvent) => {
  draggedItemId = props.item.id
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', props.item.id)
  }
  // Add a visual feedback
  ;(event.target as HTMLElement).style.opacity = '0.5'
}

const handleDragEnd = (event: DragEvent) => {
  ;(event.target as HTMLElement).style.opacity = '1'
  draggedItemId = null
}

const handleDragOver = (event: DragEvent) => {
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  // Don't allow dropping on itself
  if (draggedItemId !== props.item.id) {
    isDragOver.value = true
  }
}

const handleDragLeave = () => {
  isDragOver.value = false
}

const handleDrop = (event: DragEvent) => {
  isDragOver.value = false
  
  const droppedItemId = event.dataTransfer?.getData('text/plain')
  
  // Don't allow dropping on itself
  if (droppedItemId && droppedItemId !== props.item.id) {
    // Check if trying to drop a parent onto its own child (would create circular reference)
    // This check should ideally be more thorough, but for now we'll let the backend handle it
    // Use the parent's tenantWide as the target tenantWide
    emit('move', { 
      itemId: droppedItemId, 
      newParentId: props.item.id,
      targetTenantWide: props.item.tenantWide
    })
  }
}
</script>
