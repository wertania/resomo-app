<template>
  <div class="flex flex-col h-screen overflow-hidden bg-surface-0 dark:bg-surface-900">
    <!-- Top Header Bar -->
    <header
      class="sticky top-0 z-50 flex items-center justify-between h-14 px-4 border-b border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900"
    >
      <!-- Logo (left side) -->
      <div class="flex items-center">
        <img
          :src="logoPath"
          alt="Logo"
          class="h-8 w-8 object-contain"
        />
      </div>

      <!-- Page Title (center) -->
      <div class="flex-1 text-center">
        <h1 class="text-lg font-semibold text-surface-900 dark:text-surface-0 truncate">
          {{ pageTitle }}
        </h1>
      </div>

      <!-- User Profile Button (right side) -->
      <div class="relative">
        <Button
          variant="text"
          size="small"
          class="flex items-center gap-2 px-2 h-10"
          @click="toggleProfileMenu"
          aria-label="Profile"
          aria-haspopup="true"
          :aria-expanded="profileMenuOpen"
        >
          <Avatar
            v-if="userProfileImage !== 'images/user.png'"
            :image="userProfileImage"
            shape="circle"
            size="normal"
            class="w-8 h-8"
          />
          <Avatar
            v-else
            shape="circle"
            size="normal"
            class="w-8 h-8 bg-primary text-primary-contrast flex items-center justify-center"
          >
            <span class="text-xs font-semibold">{{ userInitials }}</span>
          </Avatar>
        </Button>
        <Menu
          ref="profileMenuRef"
          :model="profileMenuItems"
          :popup="true"
          @hide="profileMenuOpen = false"
        >
          <template #item="{ item }">
            <div
              v-if="item.template === 'userInfo'"
              class="px-4 py-3 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800"
            >
              <div class="flex items-center gap-3">
                <Avatar
                  v-if="userProfileImage !== 'images/user.png'"
                  :image="userProfileImage"
                  shape="circle"
                  size="large"
                  class="w-12 h-12"
                />
                <div
                  v-else
                  class="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0"
                >
                  <span class="text-base font-semibold text-primary-contrast">{{
                    userInitials
                  }}</span>
                </div>
                <div class="min-w-0 flex-1">
                  <div
                    class="font-semibold text-surface-900 dark:text-surface-0 truncate"
                  >
                    {{ userName }}
                  </div>
                  <div
                    class="text-sm text-surface-500 dark:text-surface-400 truncate"
                  >
                    {{ userEmail }}
                  </div>
                </div>
              </div>
            </div>
            <RouterLink
              v-else-if="item.template === 'profileUser' && item.to"
              :to="item.to"
              class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800 rounded-sm no-underline text-inherit"
            >
              <IconUser class="w-4 h-4 text-surface-400 dark:text-surface-500" />
              <span>{{ item.label }}</span>
            </RouterLink>
            <div
              v-else-if="item.template === 'profileLanguage'"
              :class="[
                'flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800 rounded-sm',
                item.class,
              ]"
              @click="item.command?.({ originalEvent: $event, item })"
            >
              <IconTranslate class="w-4 h-4 text-surface-400 dark:text-surface-500" />
              <span>{{ item.label }}</span>
            </div>
            <div
              v-else-if="item.template === 'profileLogout'"
              class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800 rounded-sm"
              @click="item.command?.({ originalEvent: $event, item })"
            >
              <IconLogout class="w-4 h-4 text-surface-400 dark:text-surface-500" />
              <span>{{ item.label }}</span>
            </div>
          </template>
        </Menu>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-1 overflow-y-auto pb-16">
      <RouterView />
    </main>

    <!-- Bottom Navigation Bar -->
    <nav
      class="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-16 px-2 border-t border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 safe-area-bottom"
    >
      <RouterLink
        v-for="item in bottomNavItems"
        :key="item.to"
        :to="item.to"
        :class="[
          'flex flex-col items-center justify-center flex-1 h-full py-2 text-surface-500 dark:text-surface-400 transition-colors duration-200',
          'hover:text-primary-600 dark:hover:text-primary-400',
        ]"
        active-class="text-primary-600 dark:text-primary-400"
      >
        <component
          :is="item.icon"
          :class="[
            'w-6 h-6 mb-1 transition-colors duration-200',
            { 'text-primary-600 dark:text-primary-400': isActiveRoute(item.to) },
          ]"
        />
        <span
          :class="[
            'text-xs font-medium transition-colors duration-200',
            { 'text-primary-600 dark:text-primary-400': isActiveRoute(item.to) },
          ]"
        >
          {{ item.label }}
        </span>
      </RouterLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, markRaw } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Menu from '@/volt/Menu.vue'
import { useApp } from '@/stores/main'
import { useUser } from '@/stores/user'
import { setLocale } from '@/i18n'
import type { MenuItem } from 'primevue/menuitem'

// Icons
import IconUser from '~icons/line-md/account'
import IconLogout from '~icons/line-md/logout'
import IconTranslate from '~icons/line-md/chat'
import IconDashboard from '~icons/line-md/home'
import IconWiki from '~icons/line-md/file-document'
import IconChat from '~icons/line-md/chat-round'
import IconSettings from '~icons/line-md/cog'
import IconArchiv from '~icons/line-md/folder'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const appStore = useApp()
const userStore = useUser()
const authStore = useAuthStore()

const profileMenuRef = ref<InstanceType<typeof Menu> | null>(null)
const profileMenuOpen = ref(false)

// Logo path
const logoPath = computed(() => {
  const baseUrl = import.meta.env.BASE_URL
  return `${baseUrl}/favicon.png`
})

// Page title based on current route
const pageTitle = computed(() => {
  const routeName = route.name as string
  switch (routeName) {
    case 'MobileHome':
      return t('MenuSideItems.dashboard')
    case 'MobileArchiv':
      return t('MenuSideItems.archiv') || 'Archiv'
    case 'MobileWiki':
      return t('MenuSideItems.wiki')
    case 'MobileChat':
      return t('MenuSideItems.chat')
    case 'MobileSettings':
      return t('MenuUser.myProfile')
    default:
      return ''
  }
})

// User profile image
const userProfileImage = computed(() => {
  if (userStore.isLoading) {
    return 'images/user.png'
  }

  const image =
    userStore.currentUser?.profileImageName &&
    userStore.currentUser?.profileImageName !== ''

  if (image) {
    return `/api/v1/user/profile-image`
  }

  return 'images/user.png'
})

// User initials
const userInitials = computed(() => {
  if (userStore.isLoading) {
    return ''
  }

  const user = userStore.currentUser
  if (!user) return ''

  const firstInitial = user.firstname?.charAt(0).toUpperCase() || ''
  const lastInitial = user.surname?.charAt(0).toUpperCase() || ''

  return (
    `${firstInitial}${lastInitial}` || user.email?.charAt(0).toUpperCase() || ''
  )
})

// User name
const userName = computed(() => {
  if (userStore.isLoading || !userStore.currentUser) {
    return 'User'
  }

  const user = userStore.currentUser
  if (user.firstname && user.surname) {
    return `${user.firstname} ${user.surname}`
  }
  if (user.firstname) {
    return user.firstname
  }
  if (user.surname) {
    return user.surname
  }
  return user.email || 'User'
})

// User email
const userEmail = computed(() => {
  if (userStore.isLoading || !userStore.currentUser) {
    return 'user@example.com'
  }
  return userStore.currentUser.email || 'user@example.com'
})

// Bottom navigation items
const bottomNavItems = computed(() => {
  const tenantId = userStore.state.selectedTenant

  const items = [
    {
      label: t('MenuSideItems.dashboard'),
      icon: markRaw(IconDashboard),
      to: '/mobile',
    },
  ]

  if (tenantId) {
    items.push(
      {
        label: t('MenuSideItems.archiv') || 'Archiv',
        icon: markRaw(IconArchiv),
        to: `/mobile/tenant/${tenantId}/archiv`,
      },
      {
        label: t('MenuSideItems.wiki'),
        icon: markRaw(IconWiki),
        to: `/mobile/tenant/${tenantId}/wiki`,
      },
      {
        label: t('MenuSideItems.chat'),
        icon: markRaw(IconChat),
        to: `/mobile/tenant/${tenantId}/chat`,
      }
    )
  }

  items.push({
    label: t('MenuUser.myProfile'),
    icon: markRaw(IconSettings),
    to: '/mobile/settings',
  })

  return items
})

// Check if route is active
const isActiveRoute = (path: string) => {
  return route.path === path || route.path.startsWith(path + '/')
}

// Profile menu items
const profileMenuItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = [
    {
      template: 'userInfo',
    },
    {
      label: t('MenuUser.myProfile'),
      template: 'profileUser',
      to: '/mobile/settings',
    },
    {
      separator: true,
    },
    {
      label: `🇩🇪 ${t('MenuUser.german')}`,
      template: 'profileLanguage',
      command: () => handleLanguageChange('de'),
      class: locale.value === 'de' ? 'font-semibold' : '',
    },
    {
      label: `🇬🇧 ${t('MenuUser.english')}`,
      template: 'profileLanguage',
      command: () => handleLanguageChange('en'),
      class: locale.value === 'en' ? 'font-semibold' : '',
    },
    {
      separator: true,
    },
    {
      label: t('MenuUser.logout'),
      template: 'profileLogout',
      command: handleLogout,
    },
  ]

  return items
})

const toggleProfileMenu = (event: MouseEvent) => {
  profileMenuOpen.value = !profileMenuOpen.value
  profileMenuRef.value?.toggle(event)
}

const handleLanguageChange = (targetLocale: 'de' | 'en') => {
  setLocale(targetLocale)
  profileMenuRef.value?.hide()
}

const handleLogout = async () => {
  await authStore.logout()
}
</script>

<style scoped>
/* Safe area support for devices with notch/home indicator */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
</style>
