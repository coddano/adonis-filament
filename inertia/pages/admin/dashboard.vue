<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import AdminLayout from '@/components/admin/layout/AdminLayout.vue'
import WidgetGrid from '@/components/admin/widgets/WidgetGrid.vue'

interface Props {
  panel: {
    id: string
    path: string
    label: string
  }
  navigation: any[]
  dashboard: {
    title: string
    description?: string
    columns: 1 | 2 | 3 | 4
    gap: 'sm' | 'md' | 'lg'
    widgets: any[]
  } | null
}

defineProps<Props>()
</script>

<template>
  <Head :title="dashboard?.title || 'Dashboard'" />

  <AdminLayout>
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">
            {{ dashboard?.title || 'Dashboard' }}
          </h1>
          <p v-if="dashboard?.description" class="mt-1 text-muted-foreground">
            {{ dashboard.description }}
          </p>
        </div>
      </div>

      <!-- Dashboard Widgets -->
      <template v-if="dashboard && dashboard.widgets.length > 0">
        <WidgetGrid
          :widgets="dashboard.widgets"
          :columns="dashboard.columns"
          :gap="dashboard.gap"
        />
      </template>

      <!-- Empty state -->
      <div v-else class="flex flex-col items-center justify-center py-16 text-center">
        <div class="rounded-full bg-primary/10 p-4 mb-4">
          <svg
            class="h-12 w-12 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
        </div>
        <h3 class="text-lg font-semibold">No widgets configured</h3>
        <p class="mt-1 text-sm text-muted-foreground max-w-md">
          Configure your dashboard by defining the
          <code class="bg-muted px-1 py-0.5 rounded">configureDashboard()</code> method in your
          panel.
        </p>
      </div>
    </div>
  </AdminLayout>
</template>
