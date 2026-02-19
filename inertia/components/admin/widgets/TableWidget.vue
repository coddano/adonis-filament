<script setup lang="ts">
import { ExternalLink } from 'lucide-vue-next'

interface TableColumn {
  name: string
  label: string
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  format?: 'text' | 'number' | 'currency' | 'date' | 'badge'
  badgeColors?: Record<string, string>
}

interface Props {
  data: {
    columns: TableColumn[]
    rows: Record<string, any>[]
    options: {
      showHeader: boolean
      striped: boolean
      hoverable: boolean
      emptyMessage: string
      footer?: string
      viewAllUrl?: string
    }
  }
  heading?: string
  description?: string
}

const props = defineProps<Props>()

function formatValue(value: any, column: TableColumn): string {
  if (value === null || value === undefined) return '-'

  switch (column.format) {
    case 'number':
      return typeof value === 'number' ? value.toLocaleString('en-US') : value
    case 'currency':
      return typeof value === 'number'
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
        : value
    case 'date':
      try {
        return new Date(value).toLocaleDateString('en-US')
      } catch {
        return value
      }
    default:
      return String(value)
  }
}

function getBadgeColor(value: any, column: TableColumn): string {
  const colors = column.badgeColors || {}
  const colorClass =
    colors[value] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
  return colorClass
}

function getAlignClass(align?: 'left' | 'center' | 'right') {
  switch (align) {
    case 'center':
      return 'text-center'
    case 'right':
      return 'text-right'
    default:
      return 'text-left'
  }
}
</script>

<template>
  <div class="rounded-xl border bg-card shadow-sm overflow-hidden">
    <!-- Header -->
    <div
      v-if="heading || description || data.options.viewAllUrl"
      class="flex items-center justify-between p-6 pb-0"
    >
      <div>
        <h3 v-if="heading" class="text-lg font-semibold">{{ heading }}</h3>
        <p v-if="description" class="text-sm text-muted-foreground">{{ description }}</p>
      </div>

      <a
        v-if="data.options.viewAllUrl"
        :href="data.options.viewAllUrl"
        class="flex items-center gap-1 text-sm text-primary hover:underline"
      >
        View all
        <ExternalLink class="h-3 w-3" />
      </a>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead v-if="data.options.showHeader" class="border-b bg-muted/50">
          <tr>
            <th
              v-for="column in data.columns"
              :key="column.name"
              class="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              :class="getAlignClass(column.align)"
            >
              {{ column.label }}
            </th>
          </tr>
        </thead>

        <tbody class="divide-y">
          <tr
            v-for="(row, index) in data.rows"
            :key="index"
            class="transition-colors"
            :class="{
              'hover:bg-muted/50': data.options.hoverable,
              'bg-muted/30': data.options.striped && index % 2 === 1,
            }"
          >
            <td
              v-for="column in data.columns"
              :key="column.name"
              class="px-6 py-4 text-sm"
              :class="getAlignClass(column.align)"
            >
              <!-- Badge format -->
              <span
                v-if="column.format === 'badge'"
                class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                :class="getBadgeColor(row[column.name], column)"
              >
                {{ row[column.name] }}
              </span>

              <!-- Other formats -->
              <template v-else>
                {{ formatValue(row[column.name], column) }}
              </template>
            </td>
          </tr>

          <!-- Empty state -->
          <tr v-if="data.rows.length === 0">
            <td
              :colspan="data.columns.length"
              class="px-6 py-8 text-center text-sm text-muted-foreground"
            >
              {{ data.options.emptyMessage }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div
      v-if="data.options.footer"
      class="border-t bg-muted/50 px-6 py-3 text-sm text-muted-foreground"
    >
      {{ data.options.footer }}
    </div>
  </div>
</template>
