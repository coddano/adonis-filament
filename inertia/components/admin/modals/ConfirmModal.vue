<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Trash2, X } from 'lucide-vue-next'

interface Props {
  open: boolean
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  icon?: 'delete' | 'warning' | 'none'
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Confirm action',
  message: 'Are you sure you want to perform this action?',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  variant: 'default',
  icon: 'warning',
  loading: false,
})

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
  (e: 'update:open', value: boolean): void
}>()

const isVisible = ref(props.open)

watch(
  () => props.open,
  (val) => {
    isVisible.value = val
  }
)

function close() {
  emit('update:open', false)
  emit('cancel')
}

function confirm() {
  emit('confirm')
}

// Fermer avec Escape
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    close()
  }
}

// Classes selon le variant
function getIconBgClass() {
  switch (props.variant) {
    case 'danger':
      return 'bg-red-100 dark:bg-red-900/30'
    case 'warning':
      return 'bg-yellow-100 dark:bg-yellow-900/30'
    default:
      return 'bg-primary/10'
  }
}

function getIconColorClass() {
  switch (props.variant) {
    case 'danger':
      return 'text-red-600 dark:text-red-400'
    case 'warning':
      return 'text-yellow-600 dark:text-yellow-400'
    default:
      return 'text-primary'
  }
}

function getConfirmButtonVariant() {
  switch (props.variant) {
    case 'danger':
      return 'destructive'
    case 'warning':
      return 'default'
    default:
      return 'default'
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isVisible"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @keydown="handleKeydown"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="close" />

        <!-- Modal -->
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-4"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-4"
        >
          <div
            v-if="isVisible"
            class="relative w-full max-w-md bg-background rounded-xl shadow-2xl border overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            <!-- Header -->
            <div class="p-6 pb-0">
              <div class="flex items-start gap-4">
                <!-- Icon -->
                <div
                  v-if="icon !== 'none'"
                  class="flex-shrink-0 p-3 rounded-full"
                  :class="getIconBgClass()"
                >
                  <Trash2 v-if="icon === 'delete'" class="h-6 w-6" :class="getIconColorClass()" />
                  <AlertTriangle v-else class="h-6 w-6" :class="getIconColorClass()" />
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <h3 class="text-lg font-semibold">{{ title }}</h3>
                  <p class="mt-2 text-sm text-muted-foreground">{{ message }}</p>
                </div>

                <!-- Close button -->
                <button
                  @click="close"
                  class="flex-shrink-0 p-1 rounded-md hover:bg-muted transition-colors"
                >
                  <X class="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-end gap-3 p-6">
              <Button variant="outline" @click="close" :disabled="loading">
                {{ cancelLabel }}
              </Button>
              <Button
                :variant="getConfirmButtonVariant() as any"
                @click="confirm"
                :disabled="loading"
              >
                <span v-if="loading" class="mr-2">
                  <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                      fill="none"
                    />
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </span>
                {{ confirmLabel }}
              </Button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
