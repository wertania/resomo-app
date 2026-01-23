import { defineStore } from 'pinia'
import { fetcher } from '@/utils/fetcher'

export interface ApiToken {
  id: string
  name: string
  scopes: string[]
  lastUsed?: string
  expiresAt?: string
  createdAt: string
  tenantId: string
}

export interface ApiTokenCreate {
  name: string
  scopes: string[]
  expiresIn?: number
  tenantId: string
}

export interface ApiTokenResponse {
  token: string
}

export interface AvailableScopesResponse {
  all: string[]
}

export const useTokensStore = defineStore('tokens', {
  state: () => ({
    tokens: [] as ApiToken[],
    loading: false,
    creating: false,
    availableScopes: [] as string[],
  }),

  getters: {
    /**
     * Check if there are any tokens
     */
    hasTokens(): boolean {
      return this.tokens.length > 0
    },

    /**
     * Get token by ID
     */
    getTokenById: (state) => {
      return (id: string) => state.tokens.find((token) => token.id === id)
    },
  },

  actions: {
    /**
     * Fetch all API tokens for the current user
     */
    async fetchTokens(): Promise<ApiToken[]> {
      try {
        this.loading = true
        const response = await fetcher.get<ApiToken[]>(
          '/api/v1/user/api-tokens',
        )
        // Explicitly replace the array to ensure reactivity
        // Use splice to trigger Vue reactivity properly
        this.tokens.splice(0, this.tokens.length, ...response)
        return response
      } catch (error) {
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Fetch all available scopes for creating API tokens
     */
    async fetchAvailableScopes(): Promise<string[]> {
      try {
        this.loading = true
        const response = await fetcher.get<AvailableScopesResponse>(
          '/api/v1/user/api-tokens/available-scopes',
        )
        this.availableScopes = response.all
        return response.all
      } catch (error) {
        console.error('Failed to load available scopes:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Create a new API token
     */
    async createToken(payload: ApiTokenCreate): Promise<ApiTokenResponse> {
      try {
        this.creating = true
        const response = await fetcher.post<ApiTokenResponse>(
          '/api/v1/user/api-tokens',
          payload,
        )
        // Automatically refresh the tokens list after successful creation
        await this.fetchTokens()
        return response
      } catch (error) {
        throw error
      } finally {
        this.creating = false
      }
    },

    /**
     * Revoke (delete) an API token
     */
    async revokeToken(tokenId: string): Promise<void> {
      try {
        this.loading = true
        await fetcher.delete<void>(`/api/v1/user/api-tokens/${tokenId}`)
        // Remove token from state using splice for reactivity
        const index = this.tokens.findIndex((token) => token.id === tokenId)
        if (index !== -1) {
          this.tokens.splice(index, 1)
        }
      } catch (error) {
        console.error('Failed to revoke token:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
  },
})
