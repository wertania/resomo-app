import { defineStore } from 'pinia'
import type { KnowledgeGroup, KnowledgeGroupTeam } from '@/types/knowledgeGroup'
import { fetcher } from '@/utils/fetcher'
import { useToast } from 'primevue/usetoast'

export const useKnowledgeGroupsStore = defineStore('knowledgeGroups', () => {
  const toast = useToast()
  const { t } = useI18n()

  // State
  const groups = ref<KnowledgeGroup[]>([])
  const plainGroups = ref<KnowledgeGroup[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const groupTeams = ref(new Map<string, KnowledgeGroupTeam[]>())

  // Actions
  const fetchGroups = async (tenantId: string) => {
    loading.value = true
    try {
      if (!tenantId) return

      const response = await fetcher.get<
        Array<KnowledgeGroup & { tenantWideAccess?: boolean }>
      >(`/api/v1/tenant/${tenantId}/knowledge/groups`)

      // Map tenantWideAccess to organisationWideAccess
      const mappedResponse: KnowledgeGroup[] = response.map((group) => ({
        ...group,
        organisationWideAccess:
          group.organisationWideAccess ?? group.tenantWideAccess ?? true,
      }))

      // Add "No Assignment" group
      const noAssignmentGroup: KnowledgeGroup = {
        id: '',
        name: t('Knowledge.groups.noAssignment'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tenantId: tenantId,
        organisationWideAccess: true,
        userId: '',
      }

      groups.value = [noAssignmentGroup, ...mappedResponse]
      plainGroups.value = mappedResponse
    } catch (err: any) {
      error.value = t('Knowledge.groups.error.loading')
      toast.add({
        severity: 'error',
        summary: t('Knowledge.groups.error.loading'),
        life: 5000,
      })
    } finally {
      loading.value = false
    }
  }

  const createGroup = async (
    tenantId: string,
    group: Omit<KnowledgeGroup, 'id' | 'createdAt' | 'updatedAt'>,
  ) => {
    try {
      const response = await fetcher.post<
        KnowledgeGroup & { tenantWideAccess?: boolean }
      >(`/api/v1/tenant/${tenantId}/knowledge/groups`, group)
      // Map tenantWideAccess to organisationWideAccess
      const mappedResponse: KnowledgeGroup = {
        ...response,
        organisationWideAccess:
          response.organisationWideAccess ?? response.tenantWideAccess ?? true,
      }
      groups.value.push(mappedResponse)
      return mappedResponse
    } catch (err: any) {
      error.value = t('Knowledge.groups.error.creating')
      toast.add({
        severity: 'error',
        summary: t('Knowledge.groups.error.creating'),
        life: 5000,
      })
      throw err
    }
  }

  const updateGroup = async (
    tenantId: string,
    id: string,
    group: Partial<KnowledgeGroup>,
  ) => {
    try {
      const response = await fetcher.put<
        KnowledgeGroup & { tenantWideAccess?: boolean }
      >(`/api/v1/tenant/${tenantId}/knowledge/groups/${id}`, group)
      // Map tenantWideAccess to organisationWideAccess
      const mappedResponse: KnowledgeGroup = {
        ...response,
        organisationWideAccess:
          response.organisationWideAccess ?? response.tenantWideAccess ?? true,
      }
      const index = groups.value.findIndex((g) => g.id === id)
      if (index !== -1) {
        groups.value[index] = mappedResponse
      }
      return mappedResponse
    } catch (err: any) {
      error.value = t('Knowledge.groups.error.updating')
      toast.add({
        severity: 'error',
        summary: t('Knowledge.groups.error.updating'),
        life: 5000,
      })
      throw err
    }
  }

  const deleteGroup = async (tenantId: string, id: string) => {
    try {
      await fetcher.delete(`/api/v1/tenant/${tenantId}/knowledge/groups/${id}`)
      groups.value = groups.value.filter((g) => g.id !== id)
    } catch (err: any) {
      error.value = err + ''
      toast.add({
        severity: 'error',
        summary: t('Knowledge.groups.errorDeleting'),
        life: 5000,
      })
      throw err
    }
  }

  const clearError = () => {
    error.value = null
  }

  const fetchGroupTeams = async (tenantId: string, groupId: string) => {
    try {
      const response = await fetcher.get<KnowledgeGroupTeam[]>(
        `/api/v1/tenant/${tenantId}/knowledge/groups/${groupId}/teams`,
      )
      groupTeams.value.set(groupId, response)
      return response
    } catch (err: any) {
      error.value = t('Knowledge.groups.error.loadingTeams')
      toast.add({
        severity: 'error',
        summary: t('Knowledge.groups.error.loadingTeams'),
        life: 5000,
      })
      throw err
    }
  }

  const addTeamToGroup = async (
    tenantId: string,
    groupId: string,
    teamId: string,
  ) => {
    try {
      const response = await fetcher.post<KnowledgeGroupTeam>(
        `/api/v1/tenant/${tenantId}/knowledge/groups/${groupId}/teams/${teamId}`,
        {},
      )

      const currentTeams = groupTeams.value.get(groupId) || []
      groupTeams.value.set(groupId, [...currentTeams, response])

      return response
    } catch (err: any) {
      error.value = t('Knowledge.groups.error.addingTeam')
      toast.add({
        severity: 'error',
        summary: t('Knowledge.groups.error.addingTeam'),
        life: 5000,
      })
      throw err
    }
  }

  const removeTeamFromGroup = async (
    tenantId: string,
    groupId: string,
    teamId: string,
  ) => {
    try {
      await fetcher.delete(
        `/api/v1/tenant/${tenantId}/knowledge/groups/${groupId}/teams/${teamId}`,
      )

      const currentTeams = groupTeams.value.get(groupId) || []
      groupTeams.value.set(
        groupId,
        currentTeams.filter((team) => team.teamId !== teamId),
      )
    } catch (err: any) {
      error.value = t('Knowledge.groups.error.removingTeam')
      toast.add({
        severity: 'error',
        summary: t('Knowledge.groups.error.removingTeam'),
        life: 5000,
      })
      throw err
    }
  }

  return {
    groups,
    plainGroups,
    loading,
    error,
    groupTeams,
    fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    clearError,
    fetchGroupTeams,
    addTeamToGroup,
    removeTeamFromGroup,
  }
})
