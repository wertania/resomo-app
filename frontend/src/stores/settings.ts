import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSettingsStore = defineStore('settings', () => {
  // Global start date for financial planning
  const globalStartDate = ref<string>('2025-07');
  
  // Currency symbol
  const currency = ref<string>('€');

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

  return {
    globalStartDate,
    currency,
    formatCurrency,
    formatNumber,
    formatMonth,
    formatMonthShort,
  };
});

