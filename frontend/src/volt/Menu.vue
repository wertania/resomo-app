<template>
  <Menu
    ref="el"
    unstyled
    :pt="mergedPt"
    :ptOptions="{
      mergeProps: ptViewMerge,
    }"
  >
    <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps ?? {}" />
    </template>
  </Menu>
</template>

<script setup lang="ts">
import Menu, {
  type MenuPassThroughOptions,
  type MenuProps,
} from 'primevue/menu'
import { computed, ref } from 'vue'
import { twMerge } from 'tailwind-merge'
import { ptViewMerge } from './utils'

interface Props extends /* @vue-ignore */ MenuProps {}
const props = defineProps<Props>()

const theme = ref<MenuPassThroughOptions>({
  root: `bg-surface-0 dark:bg-surface-900 
        text-surface-700 dark:text-surface-0 
        border border-surface-200 dark:border-surface-700
        rounded-md min-w-52
        p-popup:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)]`,
  list: `m-0 p-1 list-none outline-none flex flex-col gap-[2px]`,
  item: `p-disabled:opacity-60 p-disabled:pointer-events-none`,
  itemContent: `group transition-colors duration-200 rounded-sm text-surface-700 dark:text-surface-0
        p-focus:bg-surface-100 dark:p-focus:bg-surface-800 p-focus:text-surface-800 dark:p-focus:text-surface-0
        hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-800 dark:hover:text-surface-0`,
  itemLink: `cursor-pointer flex items-center no-underline overflow-hidden relative text-inherit
        px-3 py-2 gap-2 select-none outline-none`,
  itemIcon: `text-surface-400 dark:text-surface-500
        p-focus:text-surface-500 dark:p-focus:text-surface-400
        group-hover:text-surface-500 dark:group-hover:text-surface-400`,
  itemLabel: ``,
  submenuLabel: `bg-transparent px-3 py-2 text-surface-500 dark:text-surface-400 font-semibold`,
  separator: `border-t border-surface-200 dark:border-surface-700`,
  transition: {
    enterFromClass: 'opacity-0 scale-y-75',
    enterActiveClass: 'transition duration-120 ease-[cubic-bezier(0,0,0.2,1)]',
    leaveActiveClass: 'transition-opacity duration-100 ease-linear',
    leaveToClass: 'opacity-0',
  },
})

const mergePtValue = (baseValue: any, overrideValue: any) => {
  if (!overrideValue) return baseValue

  const baseClass =
    typeof baseValue === 'string'
      ? baseValue
      : baseValue && typeof baseValue === 'object'
        ? baseValue.class
        : undefined

  if (typeof overrideValue === 'string') {
    return typeof baseClass === 'string' ? twMerge(baseClass, overrideValue) : overrideValue
  }

  if (overrideValue && typeof overrideValue === 'object') {
    const overrideClass = (overrideValue as any).class
    if (typeof baseClass === 'string' && typeof overrideClass === 'string') {
      return { ...overrideValue, class: twMerge(baseClass, overrideClass) }
    }
  }

  return overrideValue
}

const mergedPt = computed<MenuPassThroughOptions>(() => {
  const override = props.pt as any
  if (!override || typeof override !== 'object') return theme.value

  const result: any = { ...theme.value }
  for (const [key, val] of Object.entries(override)) {
    result[key] = mergePtValue((theme.value as any)[key], val)
  }

  return result
})

const el = ref()
defineExpose({
  toggle: (event: any) => el.value.toggle(event),
  hide: () => el.value.hide(),
})
</script>
