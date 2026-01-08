import { defineStore } from 'pinia'
import { Hanko } from '@teamhanko/hanko-elements'

// Check if Hanko authentication is enabled
// Only enable if VITE_HANKO_API_URL is set AND has a non-empty value
const hankoApiUrl = import.meta.env.VITE_HANKO_API_URL
const isHankoEnabled = !!hankoApiUrl && hankoApiUrl.trim() !== ''

// Create Hanko instance if enabled
const hanko = isHankoEnabled ? new Hanko(hankoApiUrl) : null

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isLoading: false,
    authType: isHankoEnabled ? 'hanko' : 'local',
    hankoUrl: hankoApiUrl,
  }),

  getters: {
    /**
     * Check if user has an existing JWT token in cookies
     */
    hasExistingToken(): boolean {
      const cookies = document.cookie.split(';')
      const jwtCookie = cookies.find((cookie) =>
        cookie.trim().startsWith('jwt='),
      )

      if (jwtCookie) {
        const token = jwtCookie.split('=')[1]
        return !!token
      }
      return false
    },

    /**
     * Check if user is authenticated synchronously (supports both JWT and Hanko)
     * Note: For Hanko, use checkAuthenticated() for async validation
     */
    isAuthenticated(): boolean {
      if (isHankoEnabled) {
        // Synchronous check - check for hanko cookie
        const hasHankoCookie = document.cookie
          .split(';')
          .some((item) => item.trim().startsWith('hanko='))
        return hasHankoCookie
      }
      return this.hasExistingToken
    },
  },

  actions: {
    /**
     * Logout - supports both JWT and Hanko
     */
    async logout() {
      // Check authType from state (runtime value) instead of compile-time constant
      if (this.authType === 'hanko' && hanko) {
        try {
          await hanko.logout()
          window.location.href = '/static/app/#/login'
        } catch (error) {
          console.error('Hanko logout error:', error)
        }
      } else {
        // Delete JWT cookie - use exact same attributes as when setting
        // Try multiple variations to ensure cookie is deleted
        const cookieOptions = [
          'jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; samesite=strict',
          'jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;secure;samesite=strict',
          'jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/',
          'jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure',
        ]

        // Delete cookie with all possible variations
        cookieOptions.forEach((cookie) => {
          document.cookie = cookie
        })

        // Redirect to Login page
        window.location.href = '/login.html'
      }
    },
  },
})
