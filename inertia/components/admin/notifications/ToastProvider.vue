<script setup lang="ts">
import { useToast, type Toast } from '@/composables/useToast'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-vue-next'

const { toasts, removeToast } = useToast()

// Icon by type
function getIcon(type: Toast['type']) {
  switch (type) {
    case 'success':
      return CheckCircle
    case 'error':
      return XCircle
    case 'warning':
      return AlertTriangle
    case 'info':
      return Info
  }
}

// Color classes by type
function getColorClasses(type: Toast['type']) {
  switch (type) {
    case 'success':
      return 'bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800'
    case 'error':
      return 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800'
    case 'warning':
      return 'bg-yellow-50 dark:bg-yellow-950/50 border-yellow-200 dark:border-yellow-800'
    case 'info':
      return 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800'
  }
}

function getIconColor(type: Toast['type']) {
  switch (type) {
    case 'success':
      return 'text-green-500'
    case 'error':
      return 'text-red-500'
    case 'warning':
      return 'text-yellow-500'
    case 'info':
      return 'text-blue-500'
  }
}

function getTextColor(type: Toast['type']) {
  switch (type) {
    case 'success':
      return 'text-green-800 dark:text-green-200'
    case 'error':
      return 'text-red-800 dark:text-red-200'
    case 'warning':
      return 'text-yellow-800 dark:text-yellow-200'
    case 'info':
      return 'text-blue-800 dark:text-blue-200'
  }
}
</script>

<template>
  <!-- Toast Container -->
  <Teleport to="body">
    <div
      class="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none"
      role="region"
      aria-label="Notifications"
    >
      <TransitionGroup
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 translate-x-full scale-95"
        enter-to-class="opacity-100 translate-x-0 scale-100"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 translate-x-0 scale-100"
        leave-to-class="opacity-0 translate-x-full scale-95"
        move-class="transition-all duration-300"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto w-96 max-w-sm overflow-hidden rounded-xl border shadow-xl backdrop-blur-sm"
          :class="getColorClasses(toast.type)"
          role="alert"
        >
          <div class="p-4">
            <div class="flex items-start gap-3">
              <!-- Icon with pulse animation for success -->
              <div
                class="flex-shrink-0 rounded-full p-1"
                :class="[
                  getIconColor(toast.type),
                  toast.type === 'success' ? 'animate-bounce-once' : '',
                ]"
              >
                <component :is="getIcon(toast.type)" class="h-5 w-5" />
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0" :class="getTextColor(toast.type)">
                <p class="text-sm font-semibold">{{ toast.title }}</p>
                <p v-if="toast.message" class="mt-1 text-sm opacity-80">
                  {{ toast.message }}
                </p>

                <!-- Action button -->
                <button
                  v-if="toast.action"
                  @click="toast.action.onClick"
                  class="mt-2 text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 rounded"
                >
                  {{ toast.action.label }}
                </button>
              </div>

              <!-- Close button -->
              <button
                @click="removeToast(toast.id)"
                class="flex-shrink-0 rounded-md p-1.5 opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all"
                :class="getTextColor(toast.type)"
              >
                <X class="h-4 w-4" />
              </button>
            </div>
          </div>

          <!-- Progress bar -->
          <div v-if="toast.duration !== 0" class="h-1 w-full bg-black/5 dark:bg-white/10">
            <div
              class="h-full animate-shrink-width"
              :class="getIconColor(toast.type).replace('text-', 'bg-')"
              :style="{ animationDuration: `${toast.duration ?? 5000}ms` }"
            />
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
@keyframes shrink-width {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

.animate-shrink-width {
  animation: shrink-width linear forwards;
}

@keyframes bounce-once {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

.animate-bounce-once {
  animation: bounce-once 0.4s ease-out;
}
</style>
