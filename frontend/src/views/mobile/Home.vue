<template>
  <div class="flex flex-col items-center justify-center gap-8 py-12">
    <h1 class="text-4xl font-bold text-[#a27029] dark:text-primary-400">
      Resomo
    </h1>
    <img
      :src="logoImage"
      alt="Logo"
      class="w-40 h-40 object-contain mx-auto"
    />
    <div class="mt-4 text-center text-lg font-medium text-[#a27029] dark:text-primary-400">
      erinnern. hören. bleiben.
    </div>
  </div>
  <!-- Bottom Button (remains above NavigationFooter) -->
  <div class="flex flex-col w-full items-center gap-2 pb-4">
    <button
      class="w-full max-w-xs px-6 py-3 bg-[#5f8353] text-white rounded-lg shadow hover:bg-[#46623c] transition-colors text-lg font-semibold mb-2"
      @click="router.push('/mobile/recording')"
    >
      Neue Session
    </button>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import logoImage from '@/assets/logo.png'

const router = useRouter()
</script>

