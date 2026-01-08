import { defineStore } from 'pinia'
import { fetcher } from '@/utils/fetcher'
import { nanoid } from 'nanoid'

// Types
interface User {
  id: string
  email: string
  firstname?: string
  surname?: string
  lastTenantId?: string
  profileImageName?: string
  [key: string]: any
}

export interface Team {
  id: string
  name: string
}

interface Tenant {
  id: string
  name: string
  role: 'owner' | 'admin' | 'member'
}

interface AppState {
  isDarkMode: boolean
  loading: boolean
  user: User | null
  selectedTenant: string
  tenants: Tenant[]
  teams: Team[]
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

// Helper function for sending events to parent window (if in iframe)
function sendEventToParent(event: { type: string; data?: any }) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(event, '*')
  }
}

export const useApp = defineStore('app', () => {
  // Composables
  const route = useRoute()
  const router = useRouter()

  // State
  const state = ref<AppState>({
    loading: true,
    user: null,
    selectedTenant: '',
    tenants: [],
    teams: [],
    isMobile: false,
    isDarkMode: false,
    membershipStatus: null,
  })

  const checkDarkMode = () => {
    state.value.isDarkMode = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches
  }

  const createTenant = async (tenantName: string) => {
    const tenant = await fetcher.post<{ id: string; name: string }>(
      '/api/v1/tenant',
      { name: tenantName },
    )
    // User who creates tenant is the owner
    state.value.tenants.push({ ...tenant, role: 'owner' })
    return tenant
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

  const getMyUser = async () => {
    const user = await fetcher.get<any>('/api/v1/user/me')
    state.value.user = user
    state.value.selectedTenant = user.lastTenantId
  }

  const getTenants = async () => {
    const tenants = await fetcher.get<
      { tenantId: string; name: string; role: 'owner' | 'admin' | 'member' }[]
    >('/api/v1/user/tenants')
    state.value.tenants = tenants.map(
      (tenant: {
        tenantId: string
        name: string
        role: 'owner' | 'admin' | 'member'
      }) => ({
        id: tenant.tenantId,
        name: tenant.name,
        role: tenant.role,
      }),
    )
  }

  const setSelectedTenant = async (tenantId: string) => {
    if (
      !tenantId ||
      tenantId === state.value.selectedTenant ||
      tenantId === ''
    ) {
      return
    }
    await fetcher.put(`/api/v1/user/last-tenant`, { tenantId: tenantId })
    sendEventToParent({
      type: 'tenant-changed',
      data: {
        tenantId: tenantId,
      },
    })
    state.value.selectedTenant = tenantId
  }

  const setupTenant = async (tenantName: string) => {
    const tenant = await fetcher.post<{ id: string; name: string }>(
      '/api/v1/user/setup',
      { tenantName },
    )
    // User who sets up tenant is the owner
    state.value.tenants = [{ ...tenant, role: 'owner' }]
    state.value.selectedTenant = tenant.id
    return tenant
  }

  const getTeams = async () => {
    if (!state.value.selectedTenant) {
      return
    }
    const teams = await fetcher.get<{ teamId: string; name: string }[]>(
      `/api/v1/user/tenant/${state.value.selectedTenant}/teams`,
    )
    state.value.teams = teams.map((team: { teamId: string; name: string }) => ({
      id: team.teamId,
      name: team.name,
    }))
  }

  const init = async () => {
    await getMyUser()
    await getTenants()

    // check if there is at least one tenant
    if (state.value.tenants.length === 0) {
      await createTenant('Default ' + nanoid(5))
      await getTenants()
    }

    if (state.value.user?.lastTenantId) {
      state.value.selectedTenant = state.value.user.lastTenantId
    } else if (
      state.value.tenants.length > 0 &&
      state.value.selectedTenant == null
    ) {
      state.value.selectedTenant = state.value.tenants[0]!.id
    }
    if (state.value.tenants.length > 0) {
      await getTeams()
    }
    state.value.loading = false
  }

  const waitForInit = async () => {
    while (state.value.loading) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  // Getters (computed properties)
  const isLoading = computed(() => state.value.loading)
  const currentUser = computed(() => state.value.user)
  const currentTenant = computed(() =>
    state.value.tenants.find((t) => t.id === state.value.selectedTenant),
  )
  const hasTenants = computed(() => state.value.tenants.length > 0)
  // Membership is considered "active" when status is active, passive, or cancellation_requested
  // (cancellation_requested is treated like active until admin approves)
  const isMembershipActive = computed(
    () =>
      state.value.membershipStatus === 'active' ||
      state.value.membershipStatus === 'passive' ||
      state.value.membershipStatus === 'cancellation_requested',
  )

  // Check if user is admin/owner in the default tenant
  const isTenantAdmin = computed(() => {
    const tenant = state.value.tenants.find(
      (t) => t.id === state.value.selectedTenant,
    )
    if (!tenant) return false
    return (
      tenant.name === 'Default' &&
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

    // Actions
    getMyUser,
    waitForInit,
    setSelectedTenant,
    getTenants,
    setupTenant,
    getTeams,
    init,
  }
})
