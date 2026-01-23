import { defineStore } from 'pinia'
import { useUser } from './user'

interface MainState {
  isDarkMode: boolean
  isMobile: boolean
  membershipStatus:
    | 'active'
    | 'passive'
    | 'inactive'
    | 'pending'
    | 'cancellation_requested'
    | 'cancelled'
    | null
}

export const useApp = defineStore('app', () => {
  // Use user store for all user-related data
  const userStore = useUser()

  // Composables
  const route = useRoute()
  const router = useRouter()

  // State
  const state = ref<MainState>({
    isMobile: false,
    isDarkMode: false,
    membershipStatus: null,
  })

  const checkDarkMode = () => {
    state.value.isDarkMode = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches
  }

  onMounted(() => {
    checkDarkMode()
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', checkDarkMode)
  })

  onUnmounted(() => {
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .removeEventListener('change', checkDarkMode)
  })

  // Getters (computed properties) - delegate to user store
  const isLoading = computed(() => userStore.isLoading)
  const currentUser = computed(() => userStore.currentUser)
  const currentTenant = computed(() => userStore.currentTenant)
  const hasTenants = computed(() => userStore.hasTenants)

  // Membership is considered "active" when status is active, passive, or cancellation_requested
  // (cancellation_requested is treated like active until admin approves)
  const isMembershipActive = computed(
    () =>
      state.value.membershipStatus === 'active' ||
      state.value.membershipStatus === 'passive' ||
      state.value.membershipStatus === 'cancellation_requested',
  )

  // Check if user is admin/owner in the "Symbiosika" tenant
  const isTenantAdmin = computed(() => {
    const tenant = userStore.currentTenant
    if (!tenant) return false
    return (
      tenant.name === 'Symbiosika' &&
      (tenant.role === 'admin' || tenant.role === 'owner')
    )
  })

  return {
    // State
    state,

    // Getters
    isLoading,
    currentUser,
    currentTenant,
    hasTenants,
    isMembershipActive,
    isTenantAdmin,

    // Composables (for convenience)
    route,
    router,

    // Expose user store for convenience
    userStore,
  }
})
