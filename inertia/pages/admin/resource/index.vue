<script setup lang="ts">
import { computed } from 'vue'
import { usePage, router } from '@inertiajs/vue3'
import { AdminLayout } from '@/components/admin/layout'
import { TableRenderer } from '@/components/admin/tables'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-vue-next'

interface Props {
  resource: {
    label: string
    singularLabel: string
    slug: string
  }
  tableSchema: any
  records: any
  queryParams: any
}

const props = defineProps<Props>()
const page = usePage()

// URL de base pour cette ressource
const panelPath = computed(() => {
  return (page.props as any).filament?.currentPanel?.path || '/admin'
})

const baseUrl = computed(() => {
  return `${panelPath.value}/${props.resource.slug}`
})

// Navigation to create page
const goToCreate = () => {
  router.visit(`${baseUrl.value}/create`)
}
</script>

<template>
  <AdminLayout>
    <!-- Page Header -->
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">{{ resource.label }}</h1>
        <p class="mt-1 text-muted-foreground">
          Manage your {{ resource.label.toLowerCase() }} from this page.
        </p>
      </div>
      <Button class="gap-2" @click="goToCreate">
        <Plus class="h-4 w-4" />
        Create {{ resource.singularLabel }}
      </Button>
    </div>

    <!-- Table Builder -->
    <TableRenderer
      :tableSchema="tableSchema"
      :records="records"
      :queryParams="queryParams"
      :resourceSlug="resource.slug"
      :panelPath="panelPath"
    />
  </AdminLayout>
</template>
