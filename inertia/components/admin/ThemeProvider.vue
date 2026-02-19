<script setup lang="ts">
import { computed, watch, onMounted } from 'vue'
import { usePage } from '@inertiajs/vue3'

interface ThemeConfig {
  brandName?: string
  logo?: {
    light?: string
    dark?: string
    height?: string
  }
  favicon?: string
  colors?: Record<string, string>
  darkMode?: 'auto' | 'light' | 'dark' | 'class'
  font?: {
    family?: string
    url?: string
  }
  sidebar?: {
    width?: string
    collapsedWidth?: string
    collapsible?: boolean
  }
  customCss?: string
  cssVariables?: string
}

const page = usePage()

const theme = computed<ThemeConfig | null>(() => {
  return (page.props as any).filament?.theme || null
})

// Injecter les CSS variables dynamiques
const injectStyles = () => {
  if (!theme.value) return

  // Remove old injected style
  const existingStyle = document.getElementById('filament-theme-styles')
  if (existingStyle) {
    existingStyle.remove()
  }

  const styleContent: string[] = []

  // CSS Variables from backend
  if (theme.value.cssVariables) {
    styleContent.push(theme.value.cssVariables)
  }

  // Custom CSS
  if (theme.value.customCss) {
    styleContent.push(theme.value.customCss)
  }

  // Font URL
  if (theme.value.font?.url) {
    const link = document.createElement('link')
    link.id = 'filament-font-link'
    link.rel = 'stylesheet'
    link.href = theme.value.font.url
    document.head.appendChild(link)
  }

  // Favicon
  if (theme.value.favicon) {
    let faviconLink = document.querySelector("link[rel~='icon']") as HTMLLinkElement
    if (!faviconLink) {
      faviconLink = document.createElement('link')
      faviconLink.rel = 'icon'
      document.head.appendChild(faviconLink)
    }
    faviconLink.href = theme.value.favicon
  }

  // Inject style tag
  if (styleContent.length > 0) {
    const style = document.createElement('style')
    style.id = 'filament-theme-styles'
    style.textContent = styleContent.join('\n')
    document.head.appendChild(style)
  }
}

// Dark mode handling
const applyDarkMode = () => {
  if (!theme.value) return

  const html = document.documentElement
  const mode = theme.value.darkMode || 'class'

  if (mode === 'dark') {
    html.classList.add('dark')
  } else if (mode === 'light') {
    html.classList.remove('dark')
  } else if (mode === 'auto') {
    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }
  // 'class' mode = user controls via toggle (already implemented)
}

onMounted(() => {
  injectStyles()
  applyDarkMode()
})

watch(
  theme,
  () => {
    injectStyles()
    applyDarkMode()
  },
  { deep: true }
)

// Expose theme for child components
defineExpose({ theme })
</script>

<template>
  <slot />
</template>
