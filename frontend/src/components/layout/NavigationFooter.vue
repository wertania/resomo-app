<template>
  <nav class="navigation-footer">
    <div
      class="navigation-footer-inner border-t border-[#f0f2f5] dark:border-surface-700 bg-white dark:bg-surface-900 px-3 py-2"
    >
      <div class="grid grid-cols-5 items-end justify-center gap-1">
        <button
          v-for="item in navItems"
          :key="item.id"
          class="flex flex-col items-center justify-center gap-1 text-[#111418] dark:text-surface-0 py-1"
          :aria-label="item.label"
          :aria-current="activeNav === item.id ? 'page' : undefined"
          @click="handleClick(item.id)"
        >
          <div
            :class="[
              'flex h-12 w-12 items-center justify-center rounded-full transition-colors',
              activeNav === item.id
                ? 'bg-[#b1cfa3] dark:bg-primary-500'
                : 'bg-[#f0f2f5] dark:bg-surface-700',
            ]"
          >
            <img
              :src="item.src"
              :alt="item.label"
              class="h-7 w-7"
            />
          </div>
        </button>
      </div>
    </div>
    <div class="safe-area-spacer" aria-hidden="true"></div>
  </nav>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

type NavId =
  | 'familiy-tree'
  | 'chat'
  | 'recording'
  | 'photobook'
  | 'archive'
  | 'home'

interface NavItem {
  id: NavId
  label: string
  src: string
}

const router = useRouter()
const route = useRoute()

import iconTree from '@/assets/icons/icon_tree.png'
import iconSearch from '@/assets/icons/icon_search.png'
import iconMic from '@/assets/icons/icon_mic.png'
import iconBook from '@/assets/icons/icon_book.png'
import iconArchive from '@/assets/icons/icon_archive.png'

const navItems: NavItem[] = [
  {
    id: 'familiy-tree',
    label: 'Familienbaum',
    src: iconTree,
  },
  {
    id: 'chat',
    label: 'KI-Assistent',
    src: iconSearch,
  },
  {
    id: 'recording',
    label: 'Aufnahme',
    src: iconMic,
  },
  {
    id: 'photobook',
    label: 'Fotobuch',
    src: iconBook,
  },
  {
    id: 'archive',
    label: 'Archiv',
    src: iconArchive,
  },
]

function routeToNavId(path: string): NavId {
  if (path.startsWith('/mobile/familiy-tree')) return 'familiy-tree'
  if (path.startsWith('/mobile/recording')) return 'recording'
  if (path.startsWith('/mobile/chat')) return 'chat'
  if (path.startsWith('/mobile/photobook')) return 'photobook'
  if (path.startsWith('/mobile/archive')) return 'archive'
  return 'home'
}

const activeNav = computed(() => routeToNavId(route.path))

function handleClick(id: NavId) {
  if (id === 'familiy-tree') router.push('/mobile/familiy-tree')
  if (id === 'chat') router.push('/mobile/chat')
  if (id === 'recording') router.push('/mobile/recording')
  if (id === 'photobook') router.push('/mobile/photobook')
  if (id === 'archive') router.push('/mobile/archive')
}
</script>

<style scoped>
.navigation-footer {
  width: 100%;
  z-index: 20;
}

.navigation-footer-inner {
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);
}

.safe-area-spacer {
  height: env(safe-area-inset-bottom, 0px);
}
</style>

