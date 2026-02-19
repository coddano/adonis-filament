<script setup lang="ts">
import { computed } from 'vue'
import { usePage, Head } from '@inertiajs/vue3'
import { AdminLayout } from '@/components/admin/layout'
import { FormRenderer } from '@/components/admin/forms'
import { ChevronRight, Plus } from 'lucide-vue-next'

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
}>()

const page = usePage()

// URL de base pour cette ressource
const baseUrl = computed(() => {
  const panelPath = (page.props as any).filament?.currentPanel?.path || '/admin'
  return `${panelPath}/${props.resource.slug}`
})

// Breadcrumbs
const breadcrumbs = computed(() => [
  { label: props.resource.label, href: baseUrl.value },
  { label: `Create ${props.resource.singularLabel}` },
])
</script>

<template>
  <Head :title="`Create ${resource.singularLabel}`" />

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
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Plus class="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 class="text-2xl font-bold tracking-tight">Create {{ resource.singularLabel }}</h1>
          <p class="text-muted-foreground">Fill out the information below</p>
        </div>
      </div>

      <!-- Formulaire -->
      <FormRenderer :schema="formSchema" :action="baseUrl" method="post" :cancel-url="baseUrl" />
    </div>
  </AdminLayout>
</template>
