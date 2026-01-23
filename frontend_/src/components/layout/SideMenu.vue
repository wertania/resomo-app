<template>
  <Menu
    :model="items"
    :class="[
      'w-full border-none !bg-transparent overflow-hidden',
      collapsed && 'collapsed !min-w-0',
    ]"
  >
    <template #item="{ item }">
      <router-link
        v-if="item.to"
        :to="item.to"
        :class="[
          'flex items-center cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800 rounded-sm no-underline text-surface-700 dark:text-surface-0 transition-colors duration-200',
          collapsed
            ? 'justify-center !px-0 py-3 w-full collapsed !mx-0'
            : 'gap-2 px-3 py-2',
        ]"
        active-class="bg-surface-100 dark:bg-surface-800 font-medium text-primary-600 dark:text-primary-400"
        :title="collapsed ? item.label : undefined"
      >
        <component
          :is="item.icon"
          :class="[
            'text-surface-400 dark:text-surface-500 transition-all duration-200 flex-shrink-0',
            collapsed ? 'w-5 h-5' : 'w-4 h-4',
            {
              'text-primary-600 dark:text-primary-400': $route.path === item.to,
            },
          ]"
        />
        <span v-if="!collapsed" class="transition-opacity duration-200">{{
          item.label
        }}</span>
      </router-link>
      <div
        v-else-if="item.command"
        :class="[
          'flex items-center cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800 rounded-sm text-surface-700 dark:text-surface-0 transition-colors duration-200',
          collapsed
            ? 'justify-center !px-0 py-3 w-full collapsed !mx-0'
            : 'gap-2 px-3 py-2',
        ]"
        @click="item.command?.({ originalEvent: $event, item })"
        :title="collapsed ? item.label : undefined"
      >
        <component
          :is="item.icon"
          :class="[
            'text-surface-400 dark:text-surface-500 transition-all duration-200 flex-shrink-0',
            collapsed ? 'w-5 h-5' : 'w-4 h-4',
          ]"
        />
        <span v-if="!collapsed" class="transition-opacity duration-200">{{
          item.label
        }}</span>
      </div>
    </template>
  </Menu>
</template>

<script setup lang="ts">
import { computed, markRaw } from 'vue'
import { useI18n } from 'vue-i18n'
import Menu from '@/volt/Menu.vue'
import { useApp } from '@/stores/main'
import IconDashboard from '~icons/mdi/view-dashboard'
import IconFinancial from '~icons/mdi/finance'
import IconChart from '~icons/mdi/chart-line'
import IconRoadmap from '~icons/mdi/map-marker-path'
import IconCompetitors from '~icons/mdi/account-group'
import IconMemberships from '~icons/mdi/card-account-details'
import IconProtocol from '~icons/mdi/microphone'
import IconChat from '~icons/mdi/chat'
import IconBook from '~icons/mdi/book'
import IconWiki from '~icons/mdi/file-document-multiple-outline'
import type { MenuItem } from 'primevue/menuitem'

interface CustomMenuItem extends Omit<MenuItem, 'icon'> {
  icon?: string | Component
  to?: string
}

interface Props {
  collapsed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  collapsed: false,
})

const { t } = useI18n()
const appStore = useApp()

const items = computed(() => {
  const tenantId = appStore.state.selectedTenant

  const menuItems: CustomMenuItem[] = [
    {
      label: t('MenuSideItems.dashboard'),
      icon: markRaw(IconDashboard),
      to: '/dashboard',
    },
    {
      label: t('MenuSideItems.financialPlanning'),
      icon: markRaw(IconFinancial),
      to: '/financial/planning',
    },
    {
      label: t('MenuSideItems.financialDashboard'),
      icon: markRaw(IconChart),
      to: '/financial/dashboard',
    },
    {
      label: t('MenuSideItems.roadmap'),
      icon: markRaw(IconRoadmap),
      to: '/roadmap',
    },
    {
      label: t('MenuSideItems.competitors'),
      icon: markRaw(IconCompetitors),
      to: '/competitors',
    },
    {
      label: t('MenuSideItems.memberships'),
      icon: markRaw(IconMemberships),
      to: '/memberships',
    },
    {
      label: t('MenuSideItems.protocol'),
      icon: markRaw(IconProtocol),
      to: '/transcription',
    },
  ]

  // Add tenant-specific menu items if tenantId is available
  if (tenantId) {
    menuItems.push(
      {
        label: t('MenuSideItems.chat'),
        icon: markRaw(IconChat),
        to: `/tenant/${tenantId}/chat`,
      },
      {
        label: t('MenuSideItems.wiki'),
        icon: markRaw(IconWiki),
        to: `/tenant/${tenantId}/wiki`,
      },
      {
        label: t('MenuSideItems.manageKnowledgeGroups'),
        icon: markRaw(IconBook),
        to: `/manage/${tenantId}/knowledge`,
      },
    )
  }

  return menuItems as any
})
</script>

<style scoped>
/* Override Menu root min-width when collapsed */
:deep(.collapsed.p-menu) {
  min-width: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
}

/* Override Menu list padding when collapsed */
:deep(.collapsed .p-menu-list) {
  padding: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
}

/* Override Menu item link padding and alignment when collapsed */
:deep(.collapsed .p-menu-item-link) {
  padding-left: 0 !important;
  padding-right: 0 !important;
  justify-content: center !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}

/* Ensure menu items take full width */
:deep(.p-menu-item) {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}

/* Ensure menu item content takes full width */
:deep(.collapsed .p-menu-item-content) {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}

/* Ensure router-link takes full width and is centered when collapsed */
:deep(.collapsed .p-menu-item-link > a),
:deep(.collapsed .p-menu-item-link > a.router-link-active) {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
  justify-content: center !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  display: flex !important;
  align-items: center !important;
  overflow: hidden !important;
}
</style>
