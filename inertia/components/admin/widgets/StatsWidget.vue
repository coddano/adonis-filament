<script setup lang="ts">
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Shield,
  UserPlus,
  Zap,
  Circle,
  Activity,
  CreditCard,
  DollarSign,
  ShoppingCart,
} from 'lucide-vue-next'

// Icon mapping for convenience
const iconMap: Record<string, any> = {
  'users': Users,
  'shield': Shield,
  'user-plus': UserPlus,
  'zap': Zap,
  'activity': Activity,
  'credit-card': CreditCard,
  'dollar-sign': DollarSign,
  'shopping-cart': ShoppingCart,
}

interface Stat {
  label: string
  value: string | number
  description?: string
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
    label?: string
  }
  icon?: string
  color?: 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'secondary'
  chart?: number[]
}

interface Props {
  data: {
    stats: Stat[]
    columns: 1 | 2 | 3 | 4
  }
  heading?: string
  description?: string
}

const props = defineProps<Props>()

function getIconComponent(iconName?: string) {
  if (!iconName) return null
  return iconMap[iconName] || Circle
}

function getColorClasses(color?: Stat['color']) {
  switch (color) {
    case 'success':
      return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
    case 'danger':
      return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
    case 'warning':
      return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30'
    case 'info':
      return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30'
    case 'secondary':
      return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800'
    default:
      return 'text-primary bg-primary/10'
  }
}

function getTrendColor(direction?: 'up' | 'down' | 'neutral') {
  switch (direction) {
    case 'up':
      return 'text-green-600 dark:text-green-400'
    case 'down':
      return 'text-red-600 dark:text-red-400'
    default:
      return 'text-muted-foreground'
  }
}

function getGridCols(columns: number) {
  switch (columns) {
    case 1:
      return 'grid-cols-1'
    case 2:
      return 'grid-cols-1 sm:grid-cols-2'
    case 3:
      return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
    case 4:
      return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  }
}

// Simple sparkline renderer
function getSparklinePath(data: number[]): string {
  if (!data || data.length < 2) return ''

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const width = 100
  const height = 30
  const stepX = width / (data.length - 1)

  const points = data
    .map((val, i) => {
      const x = i * stepX
      const y = height - ((val - min) / range) * height
      return `${x},${y}`
    })
    .join(' ')

  return `M ${points.replace(/ /g, ' L ')}`
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div v-if="heading || description">
      <h3 v-if="heading" class="text-lg font-semibold">{{ heading }}</h3>
      <p v-if="description" class="text-sm text-muted-foreground">{{ description }}</p>
    </div>

    <!-- Stats Grid -->
    <div class="grid gap-4" :class="getGridCols(data.columns)">
      <div
        v-for="(stat, index) in data.stats"
        :key="index"
        class="relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md"
      >
        <!-- Icon -->
        <div
          v-if="stat.icon"
          class="absolute top-4 right-4 rounded-full p-2"
          :class="getColorClasses(stat.color)"
        >
          <component :is="getIconComponent(stat.icon)" class="h-5 w-5" />
        </div>

        <!-- Content -->
        <div class="space-y-2">
          <p class="text-sm font-medium text-muted-foreground">{{ stat.label }}</p>

          <p class="text-3xl font-bold tracking-tight">{{ stat.value }}</p>

          <!-- Trend -->
          <div
            v-if="stat.trend"
            class="flex items-center gap-1 text-sm"
            :class="getTrendColor(stat.trend.direction)"
          >
            <TrendingUp v-if="stat.trend.direction === 'up'" class="h-4 w-4" />
            <TrendingDown v-else-if="stat.trend.direction === 'down'" class="h-4 w-4" />
            <Minus v-else class="h-4 w-4" />
            <span class="font-medium">{{ stat.trend.value }}%</span>
            <span v-if="stat.trend.label" class="text-muted-foreground ml-1">{{
              stat.trend.label
            }}</span>
          </div>

          <!-- Description -->
          <p v-if="stat.description" class="text-sm text-muted-foreground">
            {{ stat.description }}
          </p>
        </div>

        <!-- Mini Sparkline -->
        <div
          v-if="stat.chart && stat.chart.length > 1"
          class="absolute bottom-0 left-0 right-0 h-12 opacity-30 pointer-events-none"
        >
          <svg class="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
            <path
              :d="getSparklinePath(stat.chart)"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              :class="getTrendColor(stat.trend?.direction)"
            />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>
