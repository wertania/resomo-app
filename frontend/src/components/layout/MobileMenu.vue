<template>
  <div v-if="open" class="menu-overlay" @click="handleClose" @keydown="handleKeydown"></div>
  <div :class="['menu-drawer', { open }]">
    <!-- Account Section -->
    <div class="account-section">
      <div class="account-header">
        <div class="account-avatar">
          <IconUser class="w-8 h-8 text-white" />
        </div>
        <div class="account-info">
          <div class="account-title">Account</div>
          <div class="account-subtitle">Verwalte dein Profil</div>
        </div>
      </div>
      <button
        class="account-button"
        @click="handleAccountClick"
        aria-label="Navigate to account page"
      >
        <span>Mein Account</span>
        <IconChevronRight class="w-5 h-5" />
      </button>
      <button
        class="account-button logout"
        @click="handleLogoutClick"
        aria-label="Logout and go to login"
      >
        <span>Abmelden</span>
        <IconChevronRight class="w-5 h-5" />
      </button>
    </div>

    <!-- Menu Items -->
    <ul class="menu-list">
      <!-- Additional menu items can be added here -->
    </ul>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import IconUser from '~icons/mdi/user'
import IconChevronRight from '~icons/mdi/chevron-right'

interface Props {
  open: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()
const authStore = useAuthStore()

function handleClose() {
  emit('close')
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    handleClose()
  }
}

function handleAccountClick() {
  router.push('/mobile/account')
  handleClose()
}

async function handleLogoutClick() {
  await authStore.logout()
  handleClose()
}
</script>

<style scoped>
.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.18);
  z-index: 49;
  transition: opacity 0.2s;
  outline: none;
}

.menu-drawer {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 80vw;
  max-width: 320px;
  background: white;
  border-top-right-radius: 1.2rem;
  border-bottom-right-radius: 1.2rem;
  box-shadow: 2px 0 24px 0 rgba(0, 0, 0, 0.1), 0 1.5px 4px 0 rgba(0, 0, 0, 0.04);
  z-index: 50;
  transform: translateX(-100%);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  padding-top: 2rem;
}

.menu-drawer.open {
  transform: translateX(0);
}

.menu-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

/* Account Section Styles */
.account-section {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(135deg, #f8faf7 0%, #f0f4ed 100%);
}

.account-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.account-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #5f8353;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 2px 8px rgba(95, 131, 83, 0.25);
}

.account-info {
  flex: 1;
}

.account-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.125rem;
}

.account-subtitle {
  font-size: 0.875rem;
  color: #6b7280;
}

.account-button {
  width: 100%;
  padding: 0.75rem 1rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 1rem;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.account-button:hover {
  background: #5f8353;
  color: white;
  border-color: #5f8353;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(95, 131, 83, 0.25);
}

.account-button.logout {
  margin-top: 0.75rem;
}

.account-button.logout:hover {
  background: #c23b22;
  border-color: #c23b22;
  color: white;
}

.account-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(95, 131, 83, 0.2);
}

.account-button span {
  font-weight: 500;
}

.account-button svg {
  transition: transform 0.2s ease;
}

.account-button:hover svg {
  transform: translateX(3px);
}
</style>

