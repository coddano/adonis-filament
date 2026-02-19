<script setup lang="ts">
import { computed } from 'vue'

interface BadgeOption {
  value: string | number | boolean
  label: string
  color: string
  icon?: string
}

interface Props {
  value: any
  column: {
    options?: BadgeOption[]
    defaultColor?: string
  }
}

const props = defineProps<Props>()

const matchingOption = computed(() => {
  if (!props.column.options) return null

  return props.column.options.find((opt) => {
    if (typeof opt.value === 'boolean') {
      return opt.value === (props.value === true || props.value === 1 || props.value === '1')
    }
    return String(opt.value) === String(props.value)
  })
})

const label = computed(() => {
  if (matchingOption.value?.label) return matchingOption.value.label
  if (props.value === null || props.value === undefined || props.value === '') return '-'
  return String(props.value)
})

const colorClass = computed(() => {
  const color = matchingOption.value?.color || props.column.defaultColor || 'gray'

  switch (color) {
    case 'green':
    case 'success':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    case 'red':
    case 'danger':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    case 'yellow':
    case 'warning':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'blue':
    case 'primary':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    case 'purple':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
    case 'pink':
      return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400'
    case 'indigo':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
  }
})
</script>

<template>
  <span
    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    :class="colorClass"
  >
    {{ label }}
  </span>
</template>
