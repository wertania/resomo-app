<template>
  <div class="sticky top-0 z-20 flex items-center justify-between border-b border-surface-200 bg-white px-4 py-4 shadow-sm dark:border-surface-700 dark:bg-surface-900">
    <div>
      <h1 class="text-xl font-bold text-color">
        <RouterLink
          v-if="backRouteName && backTitle"
          :to="backRouteName"
          class="mr-5 text-sm text-color"
        >
          <IconFaSolidArrowLeft /> {{ backTitle }}
        </RouterLink>
        <span v-if="header" class="text-color"> {{ header }} </span>
        <slot name="header" v-if="$slots.header" />
      </h1>
    </div>
    <div class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import IconFaSolidArrowLeft from '~icons/line-md/arrow-left'
const props = defineProps({
  header: {
    type: String,
    required: false,
  },
  backTitle: {
    type: String,
  },
  backRouteName: {
    type: String,
  },
})
</script>
