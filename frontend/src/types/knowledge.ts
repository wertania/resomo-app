import type { KnowledgeGroup } from './knowledgeGroup'

export interface DefaultTypes {
  sourceType: 'db' | 'local' | 'url' | 'text' | 'external'
  showSuccessMessage: boolean
}

export interface KnowledgeEntry {
  id: string
  tenantId: string
  name: string
  description: string | null
  knowledgeGroupId: string | null
  knowledgeGroup?: KnowledgeGroup | null
  userId: string
  userOwned: boolean
  teamId: string | null
  meta: Record<string, any>
  version: number
  versionText: string
  hidden: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  parentId: string | null

  // Optional fields that might be present in some contexts or legacy
  sourceType?: string
  sourceId?: string | null
  sourceFileBucket?: string | null
  sourceUrl?: string | null
  abstract?: string | null
  filters?: {
    id: string
    filter: {
      id: string
      category: string
      name: string
    }
  }[]
}

export type KnowledgeEntryWithText = {
  entry: KnowledgeEntry
  text: string
}

export interface KnowledgeFilters {
  userId?: string
  teamId?: string
  tenantId?: string
  categories?: Record<string, string>
  workspaceId?: string
  knowledgeGroupId?: string
  userOwned?: boolean
}

export interface KnowledgeFilter {
  id?: string
  category: string
  name: string
  tenantId?: string
}

export type Filter = {
  id?: string
  filterId?: string
  category: string
  name: string
}

export type KnowledgeFilterGroupsFromServer = Record<string, Filter[]>

export type KnowledgeFilterGroups = Record<string, string[]>

export type KnowledgeAssignmentType =
  | 'organisation'
  | 'user'
  | 'team'
  | 'workspace'
  | 'knowledgeGroup'

export interface KnowledgeAssignment {
  type: KnowledgeAssignmentType
  id: string
  tenantId: string
}
export type result = {
  file: File
  status: string
  response?: { path: string; id: string; name: string; tenantId?: string }
}

export interface PostProcessor {
  name: string
  label: string
  description: string
}
