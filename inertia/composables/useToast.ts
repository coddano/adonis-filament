import { ref, readonly } from 'vue'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

// Reactive global store
const toasts = ref<Toast[]>([])

// Generate a unique ID
function generateId() {
  return Math.random().toString(36).substring(2, 11)
}

// Ajouter un toast
function addToast(toast: Omit<Toast, 'id'>) {
  const id = generateId()
  const newToast = { ...toast, id }
  toasts.value.push(newToast)

  // Auto-remove after duration
  const duration = toast.duration ?? 5000
  if (duration > 0) {
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }

  return id
}

// Retirer un toast
function removeToast(id: string) {
  const index = toasts.value.findIndex((t) => t.id === id)
  if (index > -1) {
    toasts.value.splice(index, 1)
  }
}

// Retirer tous les toasts
function clearToasts() {
  toasts.value = []
}

// Typed shortcuts
function success(title: string, message?: string, options?: Partial<Toast>) {
  return addToast({ type: 'success', title, message, ...options })
}

function error(title: string, message?: string, options?: Partial<Toast>) {
  return addToast({ type: 'error', title, message, duration: 8000, ...options })
}

function warning(title: string, message?: string, options?: Partial<Toast>) {
  return addToast({ type: 'warning', title, message, ...options })
}

function info(title: string, message?: string, options?: Partial<Toast>) {
  return addToast({ type: 'info', title, message, ...options })
}

// Composable
export function useToast() {
  return {
    toasts: readonly(toasts),
    addToast,
    removeToast,
    clearToasts,
    success,
    error,
    warning,
    info,
  }
}

// Export pour usage direct
export const toast = {
  success,
  error,
  warning,
  info,
  add: addToast,
  remove: removeToast,
  clear: clearToasts,
}
