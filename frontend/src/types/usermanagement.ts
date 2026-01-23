export interface TeamMember {
  userId: string
  userEmail: string
  role: string
}

export interface Team {
  id: string
  name: string
}

export interface TenantMember {
  userId: string
  userEmail: string
  role: string
}

export interface TenantInvitation {
  id: string
  tenantId: string
  tenantName: string
  email: string
  status: 'pending' | 'accepted' | 'rejected'
  role: string
}

export interface User {
  id: string
  email: string
  firstname?: string
  surname?: string
  lastTenantId?: string
  profileImageName?: string
  [key: string]: any
}

// Tenant representation (matches GET /api/v1/user/tenants response structure)
export interface Tenant {
  tenantId: string
  name: string
  role: 'owner' | 'admin' | 'member'
}

// Tenant create/setup response (POST /api/v1/user/setup, POST /api/v1/tenant)
// Backend returns id, but we map it to tenantId for consistency
export interface TenantCreateResponse {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}
