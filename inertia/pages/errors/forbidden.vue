<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-900">
    <div class="text-center">
      <div class="text-6xl font-bold text-red-500 mb-4">403</div>
      <h1 class="text-2xl font-semibold text-white mb-2">Unauthorized access</h1>
      <p class="text-gray-400 mb-6">
        {{ message || 'You do not have the required permissions to access this page.' }}
      </p>
      <a
        href="/admin"
        class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Back to dashboard
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  message?: string
}>()
</script>
