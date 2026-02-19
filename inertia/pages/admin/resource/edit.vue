<script setup lang="ts">
import { computed } from 'vue'
import { usePage, Head } from '@inertiajs/vue3'
import { AdminLayout } from '@/components/admin/layout'
import { FormRenderer } from '@/components/admin/forms'
import { ChevronRight, Pencil } from 'lucide-vue-next'

interface ResourceData {
  label: string
  singularLabel: string
  slug: string
}

interface FormSchema {
  columns: number
  fields: any[]
}

const props = defineProps<{
  resource: ResourceData
  formSchema: FormSchema
  record: Record<string, any>
}>()

const page = usePage()

// URL de base pour cette ressource
const baseUrl = computed(() => {
  const panelPath = (page.props as any).filament?.currentPanel?.path || '/admin'
  return `${panelPath}/${props.resource.slug}`
})

// Edit URL (for form submission)
const editUrl = computed(() => `${baseUrl.value}/${props.record.id}`)

// Breadcrumbs
const breadcrumbs = computed(() => [
  { label: props.resource.label, href: baseUrl.value },
  { label: `Edit ${props.resource.singularLabel}` },
])

// Title based on data
const recordTitle = computed(() => {
  return props.record.fullName || props.record.name || props.record.email || `#${props.record.id}`
})
</script>

<template>
  <Head :title="`Edit ${recordTitle}`" />

  <AdminLayout>
    <div class="space-y-6">
      <!-- Breadcrumbs -->
      <nav class="flex items-center text-sm text-muted-foreground">
        <template v-for="(crumb, index) in breadcrumbs" :key="index">
          <a v-if="crumb.href" :href="crumb.href" class="hover:text-foreground transition-colors">
            {{ crumb.label }}
          </a>
          <span v-else class="text-foreground font-medium">
            {{ crumb.label }}
          </span>
          <ChevronRight v-if="index < breadcrumbs.length - 1" class="mx-2 h-4 w-4" />
        </template>
      </nav>

      <!-- Header -->
      <div class="flex items-center gap-4">
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
          <Pencil class="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <h1 class="text-2xl font-bold tracking-tight">Edit {{ recordTitle }}</h1>
          <p class="text-muted-foreground">
            Update the information for {{ resource.singularLabel.toLowerCase() }}
          </p>
        </div>
      </div>

      <!-- Formulaire -->
      <FormRenderer
        :schema="formSchema"
        :data="record"
        :action="editUrl"
        method="put"
        :cancel-url="baseUrl"
      />
    </div>
  </AdminLayout>
</template>
