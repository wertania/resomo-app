<template>
  <div class="flex h-screen overflow-hidden bg-surface-0 dark:bg-surface-900">
    <!-- Desktop Sidebar -->
    <aside
      :class="[
        'hidden md:flex flex-col transition-all duration-300 ease-in-out',
        'border-r border-surface-200 dark:border-surface-700',
        'bg-surface-50 dark:bg-surface-800',
        'overflow-hidden',
        sidebarCollapsed ? 'w-20' : 'w-72',
      ]"
    >
      <!-- Sidebar Header -->
      <div
        class="flex items-center justify-center h-16 px-4 bg-surface-50 dark:bg-surface-800"
      >
        <transition name="fade" mode="out-in">
          <div
            v-if="!sidebarCollapsed"
            key="expanded"
            class="flex items-center gap-3 flex-1 min-w-0"
          >
            <slot name="logo">
              <img
                :src="logoPath"
                alt="Symbiosika"
                class="h-12 w-auto object-contain"
              />
            </slot>
          </div>
          <div
            v-else
            key="collapsed"
            class="flex items-center justify-center w-full"
          >
            <slot name="logo-square">
              <img
                :src="logoSquarePath"
                alt="Symbiosika"
                class="h-10 w-10 object-contain"
              />
            </slot>
          </div>
        </transition>
      </div>

      <!-- Sidebar Content -->
      <div class="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        <SideMenu :collapsed="sidebarCollapsed" />
      </div>

      <!-- Sidebar Footer with Toggle Button -->
      <div
        class="flex-shrink-0 bg-surface-50 dark:bg-surface-800"
      >
        <button
          type="button"
          :class="[
            'w-full flex items-center gap-2 py-2.5 text-surface-600 dark:text-surface-400',
            'hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset',
            sidebarCollapsed ? 'justify-center px-0' : 'justify-start px-3',
          ]"
          @click="toggleSidebar"
          aria-label="Toggle sidebar"
        >
          <IconChevronLeft
            v-if="!sidebarCollapsed"
            class="w-4 h-4 flex-shrink-0 text-surface-500 dark:text-surface-400"
          />
          <IconChevronRight
            v-else
            class="w-4 h-4 flex-shrink-0 text-surface-500 dark:text-surface-400"
          />
          <span
            v-if="!sidebarCollapsed"
            class="text-sm font-medium transition-opacity duration-200"
          >
            Collapse
          </span>
        </button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="flex flex-col flex-1 overflow-hidden min-w-0">
      <!-- Header -->
      <header
        class="sticky top-0 z-50 flex items-center h-16 px-6 gap-6 border-b border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95"
      >
        <!-- Mobile Menu Toggle -->
        <Button
          variant="text"
          size="small"
          class="p-icon-only w-10 h-10 md:hidden -ml-2"
          @click="toggleMobileSidebar"
          aria-label="Toggle menu"
        >
          <IconMenu class="w-5 h-5" />
        </Button>

        <!-- Logo (Mobile when sidebar open) -->
        <div v-if="mobileSidebarOpen" class="hidden md:flex items-center mr-2">
          <slot name="logo-square">
            <img
              :src="logoSquarePath"
              alt="Symbiosika"
              class="h-8 w-8 object-contain"
            />
          </slot>
        </div>

        <!-- Breadcrumbs -->
        <div class="hidden md:flex flex-1 min-w-0">
          <slot name="breadcrumbs">
            <nav aria-label="Breadcrumb" class="flex items-center">
              <Breadcrumb :model="breadcrumbItems" class="border-none p-0" />
            </nav>
          </slot>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-1 ml-auto">
          <!-- Help (only show if membership is active) -->
          <Button
            v-if="appStore.isMembershipActive"
            variant="text"
            size="small"
            class="p-icon-only w-10 h-10"
            @click="handleHelpClick"
            aria-label="Help"
          >
            <IconHelpCircle
              class="w-5 h-5 text-surface-700 dark:text-surface-0"
            />
          </Button>

          <!-- Profile -->
          <div class="relative ml-2">
            <Button
              variant="text"
              size="small"
              class="flex items-center gap-2 px-2 h-10"
              @click="toggleDropdown('profile', $event)"
              aria-label="Profile"
              aria-haspopup="true"
              :aria-expanded="activeDropdown === 'profile'"
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
              <span
                class="hidden xl:inline-block text-sm font-medium text-surface-700 dark:text-surface-0"
              >
                {{ userName }}
              </span>
            </Button>
            <Menu
              ref="profileMenuRef"
              :model="profileMenuItems"
              :popup="true"
              @hide="activeDropdown = null"
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
                      <span
                        class="text-base font-semibold text-primary-contrast"
                        >{{ userInitials }}</span
                      >
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
                  <IconUser
                    class="w-4 h-4 text-surface-400 dark:text-surface-500"
                  />
                  <span>{{ item.label }}</span>
                </RouterLink>
                <div
                  v-else-if="item.template === 'profileUser'"
                  class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800 rounded-sm"
                  @click="item.command?.({ originalEvent: $event, item })"
                >
                  <IconUser
                    class="w-4 h-4 text-surface-400 dark:text-surface-500"
                  />
                  <span>{{ item.label }}</span>
                </div>
                <div
                  v-else-if="item.template === 'profileSettings'"
                  class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800 rounded-sm"
                  @click="item.command?.({ originalEvent: $event, item })"
                >
                  <IconCog
                    class="w-4 h-4 text-surface-400 dark:text-surface-500"
                  />
                  <span>{{ item.label }}</span>
                </div>
                <div
                  v-else-if="item.template === 'profilePrefs'"
                  class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800 rounded-sm"
                  @click="item.command?.({ originalEvent: $event, item })"
                >
                  <IconSliders
                    class="w-4 h-4 text-surface-400 dark:text-surface-500"
                  />
                  <span>{{ item.label }}</span>
                </div>
                <div
                  v-else-if="item.template === 'profileHelp'"
                  class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800 rounded-sm"
                  @click="item.command?.({ originalEvent: $event, item })"
                >
                  <IconHelpCircle
                    class="w-4 h-4 text-surface-400 dark:text-surface-500"
                  />
                  <span>{{ item.label }}</span>
                </div>
                <RouterLink
                  v-else-if="item.template === 'profileLogout' && item.to"
                  :to="item.to"
                  class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800 rounded-sm no-underline text-inherit"
                >
                  <IconLogout
                    class="w-4 h-4 text-surface-400 dark:text-surface-500"
                  />
                  <span>{{ item.label }}</span>
                </RouterLink>
                <div
                  v-else-if="item.template === 'profileLogout'"
                  class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800 rounded-sm"
                  @click="item.command?.({ originalEvent: $event, item })"
                >
                  <IconLogout
                    class="w-4 h-4 text-surface-400 dark:text-surface-500"
                  />
                  <span>{{ item.label }}</span>
                </div>
                <div
                  v-else-if="item.template === 'profileLanguage'"
                  :class="[
                    'flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800 rounded-sm',
                    item.class,
                  ]"
                  @click="item.command?.({ originalEvent: $event, item })"
                >
                  <IconTranslate
                    class="w-4 h-4 text-surface-400 dark:text-surface-500"
                  />
                  <span>{{ item.label }}</span>
                </div>
                <div
                  v-else-if="item.template === 'profileViewMode'"
                  class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800 rounded-sm"
                  @click="item.command?.({ originalEvent: $event, item })"
                >
                  <IconMobile
                    class="w-4 h-4 text-surface-400 dark:text-surface-500"
                  />
                  <span>{{ item.label }}</span>
                </div>
                <div
                  v-else-if="item.template === 'empty'"
                  class="px-3 py-2 text-sm text-surface-400 dark:text-surface-500 italic select-none"
                >
                  <span>- no content -</span>
                </div>
              </template>
            </Menu>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="flex-1 overflow-y-auto">
        <RouterView />
      </main>
    </div>

    <!-- Mobile Sidebar Overlay -->
    <Transition name="fade">
      <div
        v-if="mobileSidebarOpen"
        class="fixed inset-0 z-[95] backdrop-blur-sm md:hidden"
        style="background-color: rgba(0, 0, 0, 0.6)"
        @click="mobileSidebarOpen = false"
      />
    </Transition>

    <!-- Mobile Sidebar -->
    <Transition name="slide-left">
      <aside
        v-if="mobileSidebarOpen"
        class="fixed inset-y-0 left-0 z-[100] w-80 border-r border-surface-200 dark:border-surface-700 md:hidden flex flex-col shadow-xl bg-surface-0 dark:bg-surface-900"
      >
        <div
          class="flex items-center justify-between h-16 px-4 border-b border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900"
        >
          <slot name="logo-square">
            <img
              :src="logoSquarePath"
              alt="Symbiosika"
              class="h-9 w-9 object-contain"
            />
          </slot>
          <Button
            variant="text"
            size="small"
            class="p-icon-only w-10 h-10"
            @click="mobileSidebarOpen = false"
            aria-label="Close"
          >
            <IconClose class="w-5 h-5" />
          </Button>
        </div>
        <div class="flex-1 overflow-y-auto">
          <SideMenu :collapsed="false" />
        </div>
      </aside>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import Menu from '@/volt/Menu.vue'
import SideMenu from './SideMenu.vue'
import type { MenuItem } from 'primevue/menuitem'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useApp } from '@/stores/main'
import { useUser } from '@/stores/user'
import { useSettingsStore } from '@/stores/settings'
import { setLocale } from '@/i18n'

// Iconify icons
import IconUser from '~icons/line-md/account'
import IconCog from '~icons/line-md/cog'
import IconSliders from '~icons/line-md/cog'
import IconHelpCircle from '~icons/line-md/question-circle'
import IconLogout from '~icons/line-md/logout'
import IconMenu from '~icons/line-md/menu'
import IconClose from '~icons/line-md/close'
import IconChevronLeft from '~icons/line-md/chevron-left'
import IconChevronRight from '~icons/line-md/chevron-right'
import IconTranslate from '~icons/line-md/chat'
import IconMobile from '~icons/line-md/phone'

interface Props {
  userName?: string
  userEmail?: string
  userAvatar?: string
  isAdmin?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  userName: 'User',
  userEmail: 'user@example.com',
  userAvatar: undefined,
  isAdmin: false,
})

const emit = defineEmits<{
  'add-item': [item: string]
  'help-action': [action: string]
  'notification-click': [id: string]
  'profile-action': [action: string]
}>()

// Load sidebar state from localStorage, default to true (collapsed) if not set
const loadSidebarState = (): boolean => {
  const saved = localStorage.getItem('sidebarCollapsed')
  return saved !== null ? saved === 'true' : true
}

const sidebarCollapsed = ref(loadSidebarState())
const mobileSidebarOpen = ref(false)
const activeDropdown = ref<'add' | 'notifications' | 'profile' | null>(null)

const addMenuRef = ref<InstanceType<typeof Menu> | null>(null)
const notificationsMenuRef = ref<InstanceType<typeof Menu> | null>(null)
const profileMenuRef = ref<InstanceType<typeof Menu> | null>(null)

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const appStore = useApp()
const userStore = useUser()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const handleLogout = async () => {
  await authStore.logout()
}

const handleLanguageChange = (targetLocale: 'de' | 'en') => {
  setLocale(targetLocale)
  // Close the menu after selection
  profileMenuRef.value?.hide()
}

const handleSwitchToMobile = () => {
  settingsStore.switchViewMode('mobile')
  profileMenuRef.value?.hide()
}

// Logo paths based on dark mode
const logoPath = computed(() => {
  const baseUrl = import.meta.env.BASE_URL
  return appStore.state.isDarkMode
    ? `${baseUrl}/favicon.png`
    : `${baseUrl}/favicon.png`
})

const logoSquarePath = computed(() => {
  const baseUrl = import.meta.env.BASE_URL
  return appStore.state.isDarkMode
    ? `${baseUrl}/favicon.png`
    : `${baseUrl}/favicon.png`
})

// User profile image - only calculated once app is initialized
const userProfileImage = computed(() => {
  // Only calculate if app is initialized (not loading)
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

// User initials - only calculated once app is initialized
const userInitials = computed(() => {
  // Only calculate if app is initialized (not loading)
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

// User name from store
const userName = computed(() => {
  if (userStore.isLoading || !userStore.currentUser) {
    return props.userName || 'User'
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
  return user.email || props.userName || 'User'
})

// User email from store
const userEmail = computed(() => {
  if (userStore.isLoading || !userStore.currentUser) {
    return props.userEmail || 'user@example.com'
  }
  return userStore.currentUser.email || props.userEmail || 'user@example.com'
})

const breadcrumbItems = computed(() => {
  const items: MenuItem[] = []
  const routeName = route.name as string
  const params = route.params

  // Don't show breadcrumbs on home page
  if (routeName === 'Home' || route.path === '/') {
    return []
  }

  return items
})

const createEmptyMenuItem = (): MenuItem => ({
  label: '- no content -',
  template: 'empty',
  disabled: true,
})

const ensureMenuItems = (items: MenuItem[]): MenuItem[] =>
  items.length > 0 ? items : [createEmptyMenuItem()]

const profileMenuItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = [
    {
      template: 'userInfo',
    },
    {
      label: t('MenuUser.myProfile'),
      template: 'profileUser',
      to: '/user',
    },
  ]

  // Only show Administrators
  if (appStore.isTenantAdmin) {
    items.push(
      {
        separator: true,
      },
      {
        label: t('MenuUser.administration'),
        template: 'profileUser',
        to: '/administration',
      },
    )
  }

  items.push(
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
      label: t('MenuUser.mobileView'),
      template: 'profileViewMode',
      command: handleSwitchToMobile,
    },
    {
      separator: true,
    },
    {
      label: t('MenuUser.logout'),
      template: 'profileLogout',
      command: handleLogout,
    },
  )

  return ensureMenuItems(items)
})

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
  // Save state to localStorage
  localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed.value))
}

const toggleMobileSidebar = () => {
  mobileSidebarOpen.value = !mobileSidebarOpen.value
}

const handleHelpClick = () => {
  // Navigate to chat if tenant is available
  if (
    userStore.state.tenants &&
    userStore.state.tenants.length > 0 &&
    userStore.state.tenants[0]
  ) {
    router.push(`/tenant/${userStore.state.tenants[0].tenantId}/chat`)
  }
}

const toggleDropdown = (
  dropdown: 'add' | 'notifications' | 'profile',
  event: MouseEvent,
) => {
  let menuRef: InstanceType<typeof Menu> | null = null
  switch (dropdown) {
    case 'add':
      menuRef = addMenuRef.value
      break
    case 'notifications':
      menuRef = notificationsMenuRef.value
      break
    case 'profile':
      menuRef = profileMenuRef.value
      break
  }

  if (activeDropdown.value === dropdown && menuRef) {
    closeAllDropdowns()
    return
  }

  closeAllDropdowns()
  activeDropdown.value = dropdown

  if (menuRef) {
    menuRef.toggle(event)
  }
}

const closeAllDropdowns = () => {
  activeDropdown.value = null
  addMenuRef.value?.hide()
  notificationsMenuRef.value?.hide()
  profileMenuRef.value?.hide()
}

const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeAllDropdowns()
    if (mobileSidebarOpen.value) {
      mobileSidebarOpen.value = false
    }
  }
}

// Close mobile sidebar on route change
watch(
  () => route.path,
  () => {
    if (mobileSidebarOpen.value) {
      mobileSidebarOpen.value = false
    }
  }
)

onMounted(async () => {
  document.addEventListener('keydown', handleEscapeKey)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscapeKey)
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-left-enter-from {
  transform: translateX(-100%);
}

.slide-left-leave-to {
  transform: translateX(-100%);
}
</style>
