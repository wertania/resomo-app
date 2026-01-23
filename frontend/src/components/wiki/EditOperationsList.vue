<template>
  <div class="space-y-4">
    <div v-if="edits.length === 0" class="text-center text-gray-500">
      {{ $t('Wiki.SmartEdit.noEdits') || 'No edits to display' }}
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="(edit, index) in edits"
        :key="index"
        class="rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800"
      >
        <!-- String Replace Operation -->
        <div v-if="edit.op === 'str_replace'" class="space-y-2">
          <div class="flex items-center gap-2">
            <IconReplace class="h-5 w-5 text-blue-500" />
            <span class="font-medium text-surface-900 dark:text-surface-0">
              {{ $t('Wiki.SmartEdit.replace') || 'Replace' }}
            </span>
            <Badge :value="`#${index + 1}`" severity="info" />
          </div>

          <div class="ml-7 space-y-2">
            <div>
              <div class="mb-1 text-xs font-medium uppercase text-gray-500">
                {{ $t('Wiki.SmartEdit.oldText') || 'Old' }}
              </div>
              <pre
                class="overflow-x-auto rounded bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300"
              >{{ edit.old_str }}</pre>
            </div>

            <div class="flex justify-center">
              <IconArrowDown class="h-4 w-4 text-gray-400" />
            </div>

            <div>
              <div class="mb-1 text-xs font-medium uppercase text-gray-500">
                {{ $t('Wiki.SmartEdit.newText') || 'New' }}
              </div>
              <pre
                class="overflow-x-auto rounded bg-green-50 p-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-300"
              >{{ edit.new_str }}</pre>
            </div>
          </div>
        </div>

        <!-- Insert Operation -->
        <div v-else-if="edit.op === 'insert'" class="space-y-2">
          <div class="flex items-center gap-2">
            <IconPlus class="h-5 w-5 text-green-500" />
            <span class="font-medium text-surface-900 dark:text-surface-0">
              {{ $t('Wiki.SmartEdit.insert') || 'Insert' }}
            </span>
            <Badge :value="`#${index + 1}`" severity="success" />
            <span class="text-sm text-gray-500">
              {{
                $t('Wiki.SmartEdit.atLine', { line: edit.line_number }) ||
                `at line ${edit.line_number}`
              }}
            </span>
          </div>

          <div class="ml-7">
            <pre
              class="overflow-x-auto rounded bg-green-50 p-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-300"
            >{{ edit.text }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconReplace from '~icons/line-md/edit'
import IconPlus from '~icons/line-md/plus-circle'
import IconArrowDown from '~icons/line-md/arrow-down'

export interface EditOperation {
  op: 'str_replace' | 'insert'
  old_str?: string
  new_str?: string
  line_number?: number
  text?: string
}

interface Props {
  edits: EditOperation[]
}

defineProps<Props>()
</script>
