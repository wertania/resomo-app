import { defineStore } from 'pinia'
import { useToast } from 'primevue/usetoast'
import { fetcher } from '@/utils/fetcher'
import type {
  TenantInvitation,
  Team,
  Tenant,
  User,
} from '@/types/usermanagement'
import { nanoid } from 'nanoid'
import { useSettingsStore } from './settings'

interface UserState {
  isDarkMode: boolean
  loading: boolean
  user: User | null
  selectedTenant: string
  tenants: Tenant[]
  teams: Team[]
  isMobile: boolean
  tenantInvitations: TenantInvitation[]
}

// Helper function for sending events to parent window (if in iframe)
function sendEventToParent(event: { type: string; data?: any }) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(event, '*')
  }
}

export const useUser = defineStore('user', () => {
  // Composables
  const route = useRoute()
  const router = useRouter()
  const { t } = useI18n()
  const toast = useToast()

  // State
  const state = ref<UserState>({
    loading: true,
    user: null,
    selectedTenant: '',
    tenants: [],
    teams: [],
    isMobile: false,
    tenantInvitations: [],
    isDarkMode: false,
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

  const getMyUser = async () => {
    const user = await fetcher.get<any>('/api/v1/user/me')
    state.value.user = user
    state.value.selectedTenant = user.lastTenantId
  }

  const getTenants = async () => {
    state.value.tenants = await fetcher.get<Tenant[]>(
      '/api/v1/user/tenants',
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
    const tenantResponse = await fetcher.post<{
      id: string
      name: string
      description?: string
      createdAt: string
      updatedAt: string
    }>('/api/v1/user/setup', { tenantName })
    const tenant: Tenant = {
      tenantId: tenantResponse.id,
      name: tenantResponse.name,
      role: 'owner',
    }
    state.value.tenants = [tenant]
    state.value.selectedTenant = tenant.tenantId
    return tenant
  }

  const leaveTenant = async (tenantId: string) => {
    if (!tenantId || tenantId === 'undefined') {
      throw new Error('Invalid tenantId: tenantId is required')
    }
    await fetcher.delete(`/api/v1/user/tenant/${tenantId}/membership`)
    state.value.tenants = state.value.tenants.filter(
      (org) => org.tenantId !== tenantId,
    )
    if (state.value.selectedTenant === tenantId) {
      state.value.selectedTenant = state.value.tenants[0]?.tenantId || ''
    }
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

  const leaveTeam = async (teamId: string) => {
    if (!state.value.selectedTenant) {
      return
    }
    await fetcher.delete(
      `/api/v1/user/tenant/${state.value.selectedTenant}/teams/${teamId}/membership`,
    )
    state.value.teams = state.value.teams.filter((team) => team.id !== teamId)
  }

  const getTenantInvitations = async () => {
    if (!state.value.selectedTenant) {
      return
    }
    const invitations = await fetcher.get<TenantInvitation[]>(
      `/api/v1/user/tenants/invitations`,
    )
    state.value.tenantInvitations = invitations
    return invitations
  }

  const acceptTenantInvitation = async (invitationId: string) => {
    if (!state.value.selectedTenant) {
      return
    }
    await fetcher.post(
      `/api/v1/tenant/${state.value.selectedTenant}/invitations/${invitationId}/accept`,
      {},
    )
    await getTenantInvitations()
  }

  const declineTenantInvitation = async (invitationId: string) => {
    if (!state.value.selectedTenant) {
      return
    }
    await fetcher.post(
      `/api/v1/tenant/${state.value.selectedTenant}/invitations/${invitationId}/decline`,
      {},
    )
    await getTenantInvitations()
  }

  const createTeam = async (teamName: string) => {
    if (!state.value.selectedTenant) {
      return
    }
    const team = await fetcher.post<{ id: string; name: string }>(
      `/api/v1/tenant/${state.value.selectedTenant}/teams`,
      { name: teamName, tenantId: state.value.selectedTenant },
    )
    state.value.teams.push(team)
    return team
  }

  const deleteTeam = async (teamId: string) => {
    if (!state.value.selectedTenant) {
      throw new Error('No tenant selected')
    }
    await fetcher.delete(
      `/api/v1/tenant/${state.value.selectedTenant}/teams/${teamId}`,
    )
    state.value.teams = state.value.teams.filter((team) => team.id !== teamId)
  }

  const getTeamMembers = async (teamId: string) => {
    if (!state.value.selectedTenant) {
      return
    }
    const data = await fetcher.get<
      { teamId: string; userId: string; userEmail: string; role: string }[]
    >(`/api/v1/tenant/${state.value.selectedTenant}/teams/${teamId}/members`)
    return data
  }

  const removeTeamMember = async (teamId: string, userId: string) => {
    if (!state.value.selectedTenant) {
      return
    }
    await fetcher.delete(
      `/api/v1/tenant/${state.value.selectedTenant}/teams/${teamId}/members/${userId}`,
    )
  }

  const getTenantMembers = async (tenantId: string) => {
    const data = await fetcher.get<
      { id: string; userEmail: string; role: string; joinedAt: string }[]
    >(`/api/v1/tenant/${tenantId}/members`)
    return data
  }

  const removeTenantMember = async (tenantId: string, userId: string) => {
    await fetcher.delete(`/api/v1/tenant/${tenantId}/members/${userId}`)
  }

  const deleteTenant = async (tenantId: string) => {
    await fetcher.delete(`/api/v1/tenant/${tenantId}`)
    state.value.tenants = state.value.tenants.filter(
      (org) => org.tenantId !== tenantId,
    )
    if (state.value.selectedTenant === tenantId) {
      state.value.selectedTenant = state.value.tenants[0]?.tenantId || ''
    }
  }

  const createTenant = async (tenantName: string) => {
    const tenantResponse = await fetcher.post<{
      id: string
      name: string
      description?: string
      createdAt: string
      updatedAt: string
    }>('/api/v1/tenant', { name: tenantName })
    const tenant: Tenant = {
      tenantId: tenantResponse.id,
      name: tenantResponse.name,
      role: 'owner',
    }
    state.value.tenants.push(tenant)
    return tenant
  }

  const init = async () => {
    await getMyUser()
    await getTenants()
    await getTenantInvitations()

    // check if there is at least one tenant
    if (state.value.tenants.length === 0) {
      await createTenant('Default ' + nanoid(5))
      await getTenants()
    }

    // Set selected tenant: prefer lastTenantId from user, fallback to first tenant
    if (state.value.tenants.length > 0) {
      const lastTenantId = state.value.user?.lastTenantId
      const firstTenantId = state.value.tenants[0]!.tenantId
      const tenantExists = lastTenantId
        ? state.value.tenants.some((t) => t.tenantId === lastTenantId)
        : false

      if (tenantExists && lastTenantId) {
        // Valid lastTenantId exists, use it
        state.value.selectedTenant = lastTenantId
      } else {
        // Use first tenant if lastTenantId is null, invalid, or doesn't exist
        // Update backend to persist the selection
        await setSelectedTenant(firstTenantId)
      }
    }

    if (state.value.tenants.length > 0 && state.value.selectedTenant) {
      await getTeams()
      // Load user settings for the selected tenant
      const settingsStore = useSettingsStore()
      await settingsStore.loadUserSettings()
    }
    state.value.loading = false
  }

  const waitForInit = async () => {
    while (state.value.loading) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  const searchUserByEmail = async (email: string) => {
    const user = await fetcher.get<{
      id: string
      email: string
      firstname: string
      surname: string
    }>(`/api/v1/user/search?email=${encodeURIComponent(email)}`)
    return user
  }

  const searchUserInTenantByEmail = async (email: string) => {
    const user = await fetcher.get<{
      id: string
      email: string
      firstname: string
      surname: string
    }>(
      `/api/v1/tenant/${state.value.selectedTenant}/search/user?email=${encodeURIComponent(email)}`,
    )
    return user
  }

  const inviteTeamMember = async (
    teamId: string,
    userId: string,
    role: string,
  ) => {
    await fetcher.post(
      `/api/v1/tenant/${state.value.selectedTenant}/teams/${teamId}/members`,
      {
        userId,
        role,
      },
    )
  }

  const inviteTenantMember = async (
    tenantId: string,
    email: string,
    role: string,
  ) => {
    await fetcher.post(`/api/v1/tenant/${tenantId}/invitations`, {
      email,
      role,
      tenantId,
    })
  }

  const updateTenantName = async (tenantId: string, name: string) => {
    await fetcher.put(`/api/v1/tenant/${tenantId}`, { name })
    const orgIndex = state.value.tenants.findIndex(
      (org) => org.tenantId === tenantId,
    )
    if (orgIndex !== -1) {
      state.value.tenants[orgIndex]!.name = name
    }
  }

  const updateTeamName = async (teamId: string, name: string) => {
    await fetcher.put(
      `/api/v1/tenant/${state.value.selectedTenant}/teams/${teamId}`,
      { name, tenantId: state.value.selectedTenant },
    )
    const teamIndex = state.value.teams.findIndex((team) => team.id === teamId)
    if (teamIndex !== -1) {
      state.value.teams[teamIndex]!.name = name
    }
  }

  const updateTeamMemberRole = async (
    teamId: string,
    userId: string,
    role: string,
  ) => {
    await fetcher.put(
      `/api/v1/tenant/${state.value.selectedTenant}/teams/${teamId}/members/${userId}`,
      {
        role,
      },
    )
  }

  const updateTenantMemberRole = async (
    tenantId: string,
    userId: string,
    role: string,
  ) => {
    await fetcher.put(`/api/v1/tenant/${tenantId}/members/${userId}`, {
      role,
    })
  }

  const acceptInvitation = async (tenantId: string, invitationId: string) => {
    state.value.loading = true
    try {
      await fetcher.post(
        `/api/v1/tenant/${tenantId}/invitations/${invitationId}/accept`,
        {},
      )
      toast.add({
        severity: 'success',
        summary: t('success'),
        detail: t('UserTenants.invitations.success.accepted'),
        life: 3000,
      })
      await getTenants()
      await getTenantInvitations()

      // if empty now, redirect to main page
      if (state.value.tenantInvitations.length === 0) {
        window.location.href = '/static/app/'
      }
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: t('error'),
        detail: t('UserTenants.invitations.errors.acceptFailed') + ' ' + error,
      })
    } finally {
      state.value.loading = false
    }
  }

  const declineInvitation = async (tenantId: string, invitationId: string) => {
    state.value.loading = true
    try {
      await fetcher.post(
        `/api/v1/tenant/${tenantId}/invitations/${invitationId}/decline`,
        {},
      )
      toast.add({
        severity: 'success',
        summary: t('success'),
        detail: t('UserTenants.invitations.success.declined'),
        life: 3000,
      })
      await getTenants()
      await getTenantInvitations()
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: t('error'),
        detail: t('UserTenants.invitations.errors.declineFailed') + ' ' + error,
      })
    } finally {
      state.value.loading = false
    }
  }

  // Getters (computed properties)
  const isLoading = computed(() => state.value.loading)
  const currentUser = computed(() => state.value.user)
  const currentTenant = computed(() =>
    state.value.tenants.find(
      (t) => t.tenantId === state.value.selectedTenant,
    ),
  )
  const hasTenants = computed(() => state.value.tenants.length > 0)
  const hasTeams = computed(() => state.value.teams.length > 0)

  return {
    // State
    state,

    // Getters
    isLoading,
    currentUser,
    currentTenant,
    hasTenants,
    hasTeams,

    // Composables (for convenience)
    route,
    router,

    // Actions
    getMyUser,
    waitForInit,
    setSelectedTenant,
    getTenants,
    setupTenant,
    leaveTenant,
    getTeams,
    leaveTeam,
    getTenantInvitations,
    acceptTenantInvitation,
    declineTenantInvitation,
    createTeam,
    deleteTeam,
    getTeamMembers,
    removeTeamMember,
    getTenantMembers,
    removeTenantMember,
    deleteTenant,
    createTenant,
    init,
    searchUserByEmail,
    searchUserInTenantByEmail,
    inviteTeamMember,
    inviteTenantMember,
    updateTenantName,
    updateTeamName,
    updateTeamMemberRole,
    updateTenantMemberRole,
    acceptInvitation,
    declineInvitation,
  }
})
