<script setup lang="ts">
import StatsWidget from './StatsWidget.vue'
import ChartWidget from './ChartWidget.vue'
import TableWidget from './TableWidget.vue'

interface Widget {
  id: string
  type: 'stats' | 'chart' | 'table'
  heading?: string
  description?: string
  columnSpan: 1 | 2 | 3 | 4 | 'full'
  data: any
}

interface Props {
  widgets: Widget[]
  columns?: 1 | 2 | 3 | 4
  gap?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  columns: 4,
  gap: 'md',
})

function getWidgetComponent(type: Widget['type']) {
  switch (type) {
    case 'stats':
      return StatsWidget
    case 'chart':
      return ChartWidget
    case 'table':
      return TableWidget
    default:
      return null
  }
}

function getGapClass(gap: Props['gap']) {
  switch (gap) {
    case 'sm':
      return 'gap-2'
    case 'lg':
      return 'gap-8'
    default:
      return 'gap-4'
  }
}

function getColSpanClass(span: Widget['columnSpan']) {
  switch (span) {
    case 1:
      return 'col-span-1'
    case 2:
      return 'col-span-1 md:col-span-2'
    case 3:
      return 'col-span-1 md:col-span-2 lg:col-span-3'
    case 4:
      return 'col-span-1 md:col-span-2 lg:col-span-4'
    case 'full':
      return 'col-span-full'
  }
}
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" :class="getGapClass(gap)">
    <div v-for="widget in widgets" :key="widget.id" :class="getColSpanClass(widget.columnSpan)">
      <component
        :is="getWidgetComponent(widget.type)"
        :data="widget.data"
        :heading="widget.heading"
        :description="widget.description"
      />
    </div>
  </div>
</template>
