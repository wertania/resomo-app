<template>
  <div class="w-full" @dragenter="handleDragEnter" @dragleave="handleDragLeave">
    <!-- Drop zone for root level - only visible during drag -->
    <div
      v-show="items.length > 0 && isDragging"
      :class="[
        'mb-2 rounded border-2 border-dashed p-2 text-center text-xs transition-all',
        isDragOverRoot
          ? 'border-primary-400 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
          : 'border-surface-200 text-surface-400 dark:border-surface-700 dark:text-surface-500',
      ]"
      @dragover.prevent="handleDragOverRoot"
      @dragleave="handleDragLeaveRoot"
      @drop.prevent="handleDropRoot"
    >
      📁 {{ $t('Wiki.dropHereForRoot') || 'Drop here to move to root level' }}
    </div>

    <ul v-if="items.length > 0" class="m-0 list-none space-y-1 p-0">
      <WikiTreeNode
        v-for="item in items"
        :key="item.id"
        :item="item"
        :selected-id="selectedId"
        :is-tenant-wide="isTenantWide"
        @select="$emit('select', $event)"
        @add-child="$emit('add-child', $event)"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
        @move="$emit('move', $event)"
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

const props = defineProps<{
  items: KnowledgeText[]
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

const isDragOverRoot = ref(false)
const isDragging = ref(false)
let dragCounter = 0

// Reset drag state completely
const resetDragState = () => {
  isDragging.value = false
  isDragOverRoot.value = false
  dragCounter = 0
}

const handleDragEnter = (event: DragEvent) => {
  dragCounter++
  if (dragCounter === 1) {
    isDragging.value = true
  }
}

const handleDragLeave = (event: DragEvent) => {
  dragCounter--
  if (dragCounter === 0) {
    resetDragState()
  }
}

const handleDragOverRoot = (event: DragEvent) => {
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  isDragOverRoot.value = true
}

const handleDragLeaveRoot = () => {
  isDragOverRoot.value = false
}

const handleDropRoot = (event: DragEvent) => {
  resetDragState()
  const droppedItemId = event.dataTransfer?.getData('text/plain')
  
  if (droppedItemId) {
    emit('move', { 
      itemId: droppedItemId, 
      newParentId: null,
      targetTenantWide: props.isTenantWide ?? true
    })
  }
}

// Listen for global drag end to ensure cleanup
onMounted(() => {
  document.addEventListener('dragend', resetDragState)
  document.addEventListener('drop', resetDragState)
})

onUnmounted(() => {
  document.removeEventListener('dragend', resetDragState)
  document.removeEventListener('drop', resetDragState)
})

</script>
