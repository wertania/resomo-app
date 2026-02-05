import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { fetcher } from '@/utils/fetcher';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';
import { useUser } from './user';
import { useRouter } from 'vue-router';

export interface UserSettings {
  wiki?: {
    digitalTwin?: {
      entryPoint?: string;
    };
  };
}

export type ViewMode = 'desktop' | 'mobile';

/**
 * Detect if the user is on a mobile device based on screen size and user agent
 */
const isMobileDevice = (): boolean => {
  // Check screen width (typical mobile breakpoint)
  const isSmallScreen = window.innerWidth <= 768;
  
  // Check user agent for mobile devices
  const mobileUserAgentRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUserAgent = mobileUserAgentRegex.test(navigator.userAgent);
  
  // Consider it mobile if either condition is true
  return isSmallScreen || isMobileUserAgent;
};

export const useSettingsStore = defineStore('settings', () => {
  const toast = useToast();
  const { t } = useI18n();
  const userStore = useUser();
  const router = useRouter();

  // Global start date for financial planning
  const globalStartDate = ref<string>('2025-07');
  
  // Currency symbol
  const currency = ref<string>('€');

  // View mode (mobile/desktop) - persisted in localStorage
  // Auto-detect mobile on first visit (when no preference is saved)
  const loadViewMode = (): ViewMode => {
    const saved = localStorage.getItem('viewMode');
    if (saved === 'mobile' || saved === 'desktop') {
      return saved;
    }
    // First visit: auto-detect based on device
    const detectedMode = isMobileDevice() ? 'mobile' : 'desktop';
    localStorage.setItem('viewMode', detectedMode);
    return detectedMode;
  };
  const viewMode = ref<ViewMode>(loadViewMode());

  // User settings (per tenant)
  const userSettings = ref<UserSettings>({});
  const loadingUserSettings = ref(false);
  // Track the tenant for which settings are loaded
  const loadedForTenant = ref<string | null>(null);

  // Current tenant ID
  const currentTenantId = computed(() => userStore.state.selectedTenant);

  // Format number with German locale and thousand separators
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Format number without currency symbol (just thousand separators)
  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Format month (YYYY-MM)
  const formatMonth = (dateString: string): string => {
    const parts = dateString.split('-');
    const year = parts[0] || '2025';
    const month = parts[1] || '1';
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return new Intl.DateTimeFormat('de-DE', {
      year: 'numeric',
      month: 'long',
    }).format(date);
  };

  // Format month short (MMM YYYY)
  const formatMonthShort = (dateString: string): string => {
    const parts = dateString.split('-');
    const year = parts[0] || '2025';
    const month = parts[1] || '1';
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return new Intl.DateTimeFormat('de-DE', {
      year: 'numeric',
      month: 'short',
    }).format(date);
  };

  // Load user settings for the current tenant
  const loadUserSettings = async () => {
    const tenantId = currentTenantId.value;
    if (!tenantId) {
      console.warn('Cannot load user settings: no tenant selected');
      return;
    }

    try {
      loadingUserSettings.value = true;
      const response = await fetcher.get<{ success: boolean; data: UserSettings }>(
        `/api/v1/tenant/${tenantId}/user-settings`
      );
      if (response.success) {
        userSettings.value = response.data || {};
        loadedForTenant.value = tenantId;
      }
    } catch (error) {
      console.error('Failed to load user settings:', error);
      toast.add({
        severity: 'error',
        summary: t('Settings.errorLoading') || 'Error loading settings',
        detail: error instanceof Error ? error.message : 'Unknown error',
        life: 3000,
      });
    } finally {
      loadingUserSettings.value = false;
    }
  };

  // Save user settings for the current tenant
  const saveUserSettings = async (settings: UserSettings) => {
    const tenantId = currentTenantId.value;
    if (!tenantId) {
      console.error('Cannot save user settings: no tenant selected');
      throw new Error('No tenant selected');
    }

    try {
      loadingUserSettings.value = true;
      const response = await fetcher.post<{ success: boolean }>(
        `/api/v1/tenant/${tenantId}/user-settings`,
        settings
      );
      if (response.success) {
        userSettings.value = settings;
        loadedForTenant.value = tenantId;
        toast.add({
          severity: 'success',
          summary: t('Settings.saved') || 'Settings saved',
          life: 3000,
        });
      }
    } catch (error) {
      console.error('Failed to save user settings:', error);
      toast.add({
        severity: 'error',
        summary: t('Settings.errorSaving') || 'Error saving settings',
        detail: error instanceof Error ? error.message : 'Unknown error',
        life: 3000,
      });
      throw error;
    } finally {
      loadingUserSettings.value = false;
    }
  };

  // Set digital twin entry point for the current tenant
  const setDigitalTwinEntryPoint = async (entryId: string | null) => {
    const newSettings: UserSettings = {
      ...userSettings.value,
      wiki: {
        ...userSettings.value.wiki,
        digitalTwin: {
          ...userSettings.value.wiki?.digitalTwin,
          entryPoint: entryId || undefined,
        },
      },
    };
    await saveUserSettings(newSettings);
  };

  // Get digital twin entry point for the current tenant
  const getDigitalTwinEntryPoint = (): string | null => {
    // If settings were loaded for a different tenant, return null
    if (loadedForTenant.value !== currentTenantId.value) {
      return null;
    }
    return userSettings.value.wiki?.digitalTwin?.entryPoint || null;
  };

  // Switch view mode and navigate to equivalent route
  const switchViewMode = (mode: ViewMode) => {
    viewMode.value = mode;
    localStorage.setItem('viewMode', mode);

    const currentRoute = router.currentRoute.value;
    const currentPath = currentRoute.path;
    const tenantId = currentRoute.params.tenantId as string | undefined;

    // Map routes between desktop and mobile
    if (mode === 'mobile') {
      // Switching to mobile
      if (currentPath === '/' || currentPath === '/dashboard') {
        router.push('/mobile');
      } else if (currentPath === '/user') {
        router.push('/mobile/settings');
      } else if (tenantId && currentPath.includes('/chat')) {
        const chatId = currentRoute.params.chatId as string | undefined;
        if (chatId) {
          router.push(`/mobile/tenant/${tenantId}/chat/${chatId}`);
        } else {
          router.push(`/mobile/tenant/${tenantId}/chat`);
        }
      } else if (tenantId && currentPath.includes('/wiki')) {
        router.push(`/mobile/tenant/${tenantId}/wiki`);
      } else if (tenantId && currentPath.includes('/archiv')) {
        router.push(`/mobile/tenant/${tenantId}/archiv`);
      } else {
        // Fallback to mobile home
        router.push('/mobile');
      }
    } else {
      // Switching to desktop
      if (currentPath === '/mobile' || currentPath === '/mobile/') {
        router.push('/');
      } else if (currentPath === '/mobile/settings') {
        router.push('/user');
      } else if (tenantId && currentPath.includes('/chat')) {
        const chatId = currentRoute.params.chatId as string | undefined;
        if (chatId) {
          router.push(`/tenant/${tenantId}/chat/${chatId}`);
        } else {
          router.push(`/tenant/${tenantId}/chat`);
        }
      } else if (tenantId && currentPath.includes('/wiki')) {
        router.push(`/tenant/${tenantId}/wiki`);
      } else if (tenantId && currentPath.includes('/archiv')) {
        router.push(`/tenant/${tenantId}/archiv`);
      } else {
        // Fallback to desktop home
        router.push('/');
      }
    }
  };

  // Check if currently in mobile mode based on route
  const isMobileRoute = computed(() => {
    return router.currentRoute.value.path.startsWith('/mobile');
  });

  return {
    globalStartDate,
    currency,
    formatCurrency,
    formatNumber,
    formatMonth,
    formatMonthShort,
    userSettings,
    loadingUserSettings,
    loadUserSettings,
    saveUserSettings,
    setDigitalTwinEntryPoint,
    getDigitalTwinEntryPoint,
    loadedForTenant,
    currentTenantId,
    viewMode,
    switchViewMode,
    isMobileRoute,
  };
});

