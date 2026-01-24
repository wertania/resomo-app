import { createRouter, createWebHashHistory } from 'vue-router'
import DefaultLayout from '../components/layout/Default.vue'
import MobileLayout from '../components/layout/MobileLayout.vue'

// Check if Hanko authentication is enabled
const isHankoEnabled = !!import.meta.env.VITE_HANKO_API_URL

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/profile',
      name: 'Profile',
      component: () => import('../views/auth/profile.vue'),
      meta: { requiresAuth: true },
    },

    // Mobile Layout Routes
    {
      path: '/mobile',
      name: 'mobile',
      component: MobileLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'MobileHome',
          component: () => import('../views/dashboard/index.vue'),
        },
        {
          path: 'settings',
          name: 'MobileSettings',
          component: () => import('../views/user/index.vue'),
        },
        {
          path: 'tenant/:tenantId/chat',
          name: 'MobileChat',
          component: () => import('../views/chat/index.vue'),
        },
        {
          path: 'tenant/:tenantId/chat/:chatId',
          name: 'MobileChatWithId',
          component: () => import('../views/chat/index.vue'),
        },
        {
          path: 'tenant/:tenantId/wiki',
          name: 'MobileWiki',
          component: () => import('../views/wiki/index.vue'),
        },
        {
          path: 'tenant/:tenantId/archiv',
          name: 'MobileArchiv',
          component: () => import('../views/archiv/index.vue'),
        },
      ],
    },

    // Home
    {
      path: '/',
      name: 'home',
      component: DefaultLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'Home',
          component: () => import('../views/dashboard/index.vue'),
        },
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import('../views/dashboard/index.vue'),
        },
        {
          path: 'user',
          name: 'User',
          component: () => import('../views/user/index.vue'),
        },
        {
          path: 'tenant/:tenantId/chat',
          name: 'Chat',
          component: () => import('../views/chat/index.vue'),
        },
        {
          path: 'tenant/:tenantId/chat/:chatId',
          name: 'ChatWithId',
          component: () => import('../views/chat/index.vue'),
        },
        {
          path: 'tenant/:tenantId/wiki',
          name: 'Wiki',
          component: () => import('../views/wiki/index.vue'),
        },
        {
          path: 'tenant/:tenantId/archiv',
          name: 'Archiv',
          component: () => import('../views/archiv/index.vue'),
        },
        // {
        //   path: '/manage/:tenantId/knowledge',
        //   children: [
        //     {
        //       path: '',
        //       name: 'ManageKnowledge',
        //       component: () => import('../views/manage/knowledge/index.vue'),
        //       children: [
        //         {
        //           path: '',
        //           name: 'ManageKnowledgeGroups',
        //           component: () =>
        //             import('../views/manage/knowledge/GroupsList.vue'),
        //         },
        //         {
        //           path: ':groupId',
        //           name: 'ManageKnowledgeDetails',
        //           component: () =>
        //             import('../views/manage/knowledge/GroupDetails.vue'),
        //         },
        //       ],
        //     },
        //   ],
        // },
      ],
    },

    // 404 (not found)
    {
      path: '/:pathMatch(.*)*',
      name: '404',
      component: () => import('../views/404.vue'),
      meta: { requiresAuth: false },
    },
  ],
})

/**
 * Check if user is authenticated via JWT cookie (legacy auth)
 */
const isAuthenticatedByJwt = (): boolean => {
  return document.cookie
    .split(';')
    .some((item) => item.trim().startsWith('jwt='))
}

/**
 * Check if user is authenticated via Hanko
 * Checks for the 'hanko' cookie set by Hanko after successful login
 */
const isAuthenticatedByHanko = (): boolean => {
  const hasHankoCookie = document.cookie
    .split(';')
    .some((item) => item.trim().startsWith('hanko='))

  return hasHankoCookie
}

/**
 * Navigation guard - supports both JWT and Hanko authentication
 */
router.beforeEach((to, from, next) => {
  // Skip auth check for routes that don't require it
  if (to.meta.requiresAuth === false) {
    next()
    console.log('Authentication check skipped for route:', to.name)
    return
  }

  // Check authentication based on mode
  const isAuthenticated = isHankoEnabled
    ? isAuthenticatedByHanko()
    : isAuthenticatedByJwt()

  console.log('isAuthenticated', isAuthenticated)

  // If not authenticated and Hanko is enabled, redirect to login
  if (!isAuthenticated) {
    next({ name: 'Login' })
    return
  }

  // If not authenticated and Hanko is not enabled, allow access (existing behavior)
  // or implement your own redirect logic here
  next()
})

/**
 * Navigate to a route
 */
export const goto = (data: { name?: string; url?: string }) => {
  if (data.name) {
    router.push({ name: data.name })
  } else {
    router.push({ path: data.url })
  }
}

/**
 * Get the actual url
 */
export const getFullPath = (): string => {
  return router.currentRoute.value.fullPath
}

/**
 * Get the actual route
 */
export const getRoute = (): string => {
  return router.currentRoute.value.name?.toString() ?? ''
}

export default router
