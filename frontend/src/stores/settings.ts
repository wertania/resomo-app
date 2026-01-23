import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { fetcher } from '@/utils/fetcher';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';
import { useUser } from './user';

export interface UserSettings {
  wiki?: {
    digitalTwin?: {
      entryPoint?: string;
    };
  };
}

export const useSettingsStore = defineStore('settings', () => {
  const toast = useToast();
  const { t } = useI18n();
  const userStore = useUser();

  // Global start date for financial planning
  const globalStartDate = ref<string>('2025-07');
  
  // Currency symbol
  const currency = ref<string>('€');

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
  };
});

