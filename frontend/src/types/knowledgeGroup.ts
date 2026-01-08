export interface KnowledgeGroup {
  id: string;
  tenantId: string;
  organisationWideAccess: boolean;
  userId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeGroupTeam {
  id: string;
  teamId: string;
  teamName: string;
}
