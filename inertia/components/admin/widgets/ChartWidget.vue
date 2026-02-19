<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

interface ChartDataset {
  label: string
  data: number[]
  backgroundColor?: string | string[]
  borderColor?: string | string[]
  fill?: boolean
}

interface Props {
  data: {
    type: 'line' | 'bar' | 'area' | 'pie' | 'doughnut' | 'radar'
    labels: string[]
    datasets: ChartDataset[]
    height: number
    options: {
      showLegend: boolean
      showGrid: boolean
    }
  }
  heading?: string
  description?: string
}

const props = defineProps<Props>()
const chartRef = ref<HTMLCanvasElement | null>(null)
let chartInstance: Chart | null = null

const chartType = computed(() => {
  // area is line with fill
  if (props.data.type === 'area') return 'line'
  return props.data.type
})

function renderChart() {
  if (!chartRef.value) return

  // Destroy existing chart
  if (chartInstance) {
    chartInstance.destroy()
  }

  const ctx = chartRef.value.getContext('2d')
  if (!ctx) return

  chartInstance = new Chart(ctx, {
    type: chartType.value as any,
    data: {
      labels: props.data.labels,
      datasets: props.data.datasets.map((ds) => ({
        ...ds,
        tension: 0.4,
        pointRadius: props.data.type === 'line' ? 4 : 0,
        pointHoverRadius: 6,
        borderWidth: 2,
        fill: ds.fill ?? props.data.type === 'area',
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: props.data.options.showLegend,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20,
          },
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          cornerRadius: 8,
        },
      },
      scales: ['line', 'bar', 'area'].includes(props.data.type)
        ? {
            x: {
              grid: {
                display: props.data.options.showGrid,
                color: 'rgba(0, 0, 0, 0.05)',
              },
              ticks: {
                color: 'rgba(0, 0, 0, 0.5)',
              },
            },
            y: {
              beginAtZero: true,
              grid: {
                display: props.data.options.showGrid,
                color: 'rgba(0, 0, 0, 0.05)',
              },
              ticks: {
                color: 'rgba(0, 0, 0, 0.5)',
              },
            },
          }
        : undefined,
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false,
      },
    },
  })
}

onMounted(() => {
  renderChart()
})

watch(
  () => props.data,
  () => {
    renderChart()
  },
  { deep: true }
)
</script>

<template>
  <div class="rounded-xl border bg-card p-6 shadow-sm">
    <!-- Header -->
    <div v-if="heading || description" class="mb-4">
      <h3 v-if="heading" class="text-lg font-semibold">{{ heading }}</h3>
      <p v-if="description" class="text-sm text-muted-foreground">{{ description }}</p>
    </div>

    <!-- Chart Container -->
    <div :style="{ height: `${data.height}px` }">
      <canvas ref="chartRef"></canvas>
    </div>
  </div>
</template>
