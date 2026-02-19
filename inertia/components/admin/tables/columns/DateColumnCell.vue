<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  value: any
  column: {
    format?: string
    timezone?: string
    since?: boolean
  }
}

const props = defineProps<Props>()

const formattedDate = computed(() => {
  if (!props.value) return '-'

  try {
    const date = new Date(props.value)

    if (isNaN(date.getTime())) return '-'

    if (props.column.since) {
      return formatRelativeTime(date)
    }

    // Format basique sans Luxon (pour simplifier)
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }

    if (props.column.format?.includes('HH:mm')) {
      options.hour = '2-digit'
      options.minute = '2-digit'
    }

    return date.toLocaleDateString('en-US', options)
  } catch {
    return '-'
  }
})

function formatRelativeTime(date: Date) {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  const diffMonth = Math.floor(diffDay / 30)
  const diffYear = Math.floor(diffDay / 365)

  if (diffYear > 0) return `${diffYear} year${diffYear > 1 ? 's' : ''} ago`
  if (diffMonth > 0) return `${diffMonth} month${diffMonth > 1 ? 's' : ''} ago`
  if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`
  if (diffHour > 0) return `${diffHour}h ago`
  if (diffMin > 0) return `${diffMin}m ago`
  return 'just now'
}
</script>

<template>
  <span :title="value" class="text-muted-foreground">
    {{ formattedDate }}
  </span>
</template>
