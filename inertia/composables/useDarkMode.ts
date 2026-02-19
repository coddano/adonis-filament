import { ref, watch } from 'vue'

export function useDarkMode() {
  const isDark = ref(false)

  // Initialize from localStorage or system preference (client-side only)
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('theme')
    if (stored) {
      isDark.value = stored === 'dark'
    } else {
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
  }

  // Watch and sync with document
  watch(
    isDark,
    (value) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', value ? 'dark' : 'light')
        document.documentElement.classList.toggle('dark', value)
      }
    },
    { immediate: true }
  )

  const toggle = () => {
    isDark.value = !isDark.value
  }

  return { isDark, toggle }
}
