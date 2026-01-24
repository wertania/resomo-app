<template>
  <ProgressBar
    unstyled
    :pt="theme"
    :ptOptions="{
      mergeProps: ptViewMerge,
    }"
  >
    <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps ?? {}" />
    </template>
  </ProgressBar>
</template>

<script setup lang="ts">
import ProgressBar, {
  type ProgressBarPassThroughOptions,
  type ProgressBarProps,
} from "primevue/progressbar";
import { ref } from "vue";
import { ptViewMerge } from "./utils";

interface Props extends /* @vue-ignore */ ProgressBarProps {}
defineProps<Props>();

const theme = ref<ProgressBarPassThroughOptions>({
  root: `overflow-hidden relative`,
  value: `h-full transition-all duration-300 ease-in-out bg-primary`,
  label: `absolute top-0 left-0 flex items-center justify-center w-full h-full text-white text-xs font-semibold`,
});
</script>
