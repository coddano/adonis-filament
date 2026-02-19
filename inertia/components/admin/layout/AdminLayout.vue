<script setup lang="ts">
import { ref, provide, onMounted } from 'vue'
import Sidebar from './Sidebar.vue'
import Topbar from './Topbar.vue'
import GlobalSearch from '@/components/admin/layout/GlobalSearch.vue'
import ToastProvider from '@/components/admin/notifications/ToastProvider.vue'
import ThemeProvider from '@/components/admin/ThemeProvider.vue'
import { useDarkMode } from '@/composables/useDarkMode'

// Dark mode
const { isDark, toggle: toggleDark } = useDarkMode()
provide('isDark', isDark)
provide('toggleDark', toggleDark)

// Sidebar state
const sidebarOpen = ref(true)
const sidebarCollapsed = ref(false)

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

const toggleCollapse = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

// Mobile detection
const isMobile = ref(false)

onMounted(() => {
  const checkMobile = () => {
    isMobile.value = window.innerWidth < 1024
    if (isMobile.value) {
      sidebarOpen.value = false
    }
  }

  checkMobile()
  window.addEventListener('resize', checkMobile)
})
</script>

<template>
  <ThemeProvider>
    <div class="flex h-screen overflow-hidden bg-background">
      <!-- Sidebar -->
      <Sidebar
        :open="sidebarOpen"
        :collapsed="sidebarCollapsed"
        :is-mobile="isMobile"
        @close="sidebarOpen = false"
        @toggle-collapse="toggleCollapse"
      />

      <!-- Main Content Area -->
      <div class="flex flex-1 flex-col overflow-hidden">
        <!-- Topbar -->
        <Topbar
          :sidebar-open="sidebarOpen"
          :is-dark="isDark"
          @toggle-sidebar="toggleSidebar"
          @toggle-dark="toggleDark"
        />

        <!-- Page Content -->
        <main class="flex-1 overflow-y-auto">
          <div class="container mx-auto p-6">
            <slot />
          </div>
        </main>
      </div>

      <!-- Mobile Overlay -->
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="sidebarOpen && isMobile"
          class="fixed inset-0 z-30 bg-black/50 lg:hidden"
          @click="sidebarOpen = false"
        />
      </Transition>

      <!-- Toast Provider -->
      <ToastProvider />
      <!-- Global Search -->
      <GlobalSearch />
    </div>
  </ThemeProvider>
</template>
