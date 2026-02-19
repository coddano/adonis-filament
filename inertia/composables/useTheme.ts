import { computed } from 'vue'
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

export function useTheme() {
  const page = usePage()

  const theme = computed<ThemeConfig>(() => {
    return (page.props as any).filament?.theme || {}
  })

  const brandName = computed(() => theme.value.brandName || 'Filament')

  const logo = computed(() => theme.value.logo)

  const colors = computed(() => theme.value.colors || {})

  const primaryColor = computed(() => colors.value.primary)

  const darkMode = computed(() => theme.value.darkMode || 'class')

  const sidebarConfig = computed(() => theme.value.sidebar || {})

  const hasLogo = computed(() => !!theme.value.logo?.light || !!theme.value.logo?.dark)

  /**
   * Get logo URL based on dark mode
   */
  const getLogoUrl = (isDark: boolean): string | null => {
    if (!theme.value.logo) return null
    return isDark
      ? theme.value.logo.dark || theme.value.logo.light || null
      : theme.value.logo.light || null
  }

  /**
   * Get CSS variable value for a color
   */
  const getCssColor = (colorName: keyof NonNullable<ThemeConfig['colors']>): string => {
    const hsl = colors.value[colorName]
    return hsl ? `hsl(${hsl})` : ''
  }

  return {
    theme,
    brandName,
    logo,
    colors,
    primaryColor,
    darkMode,
    sidebarConfig,
    hasLogo,
    getLogoUrl,
    getCssColor,
  }
}
