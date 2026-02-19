<script setup lang="ts">
import { computed } from 'vue'
import { usePage, Head } from '@inertiajs/vue3'
import { AdminLayout } from '@/components/admin/layout'
import { FormRenderer } from '@/components/admin/forms'
import { ChevronRight, Cog } from 'lucide-vue-next'

interface FormSchema {
  columns: number
  fields: any[]
}

const props = defineProps<{
  title: string
  slug: string
  icon?: string
  formSchema: FormSchema
  data: Record<string, any>
}>()

const page = usePage()

// URL de base pour cette page (ex: /admin/settings)
const pageUrl = computed(() => {
  const panelPath = (page.props as any).filament?.currentPanel?.path || '/admin'
  return `${panelPath}/${props.slug}`
})

// Breadcrumbs
const breadcrumbs = computed(() => [
  { label: 'Dashboard', href: (page.props as any).filament?.currentPanel?.path || '/admin' },
  { label: props.title },
])
</script>

<template>
  <Head :title="title" />

  <AdminLayout>
    <div class="space-y-6">
      <!-- Breadcrumbs -->
      <nav class="flex items-center text-sm text-muted-foreground">
        <template v-for="(crumb, index) in breadcrumbs" :key="index">
          <a
            v-if="crumb.href && index < breadcrumbs.length - 1"
            :href="crumb.href"
            class="hover:text-foreground transition-colors"
          >
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
        <div
          class="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-500/10 dark:bg-slate-800"
        >
          <Cog class="h-6 w-6 text-slate-600 dark:text-slate-400" />
        </div>
        <div>
          <h1 class="text-2xl font-bold tracking-tight">
            {{ title }}
          </h1>
          <p class="text-muted-foreground">Manage settings for this page</p>
        </div>
      </div>

      <!-- Formulaire -->
      <div class="max-w-4xl">
        <FormRenderer
          :schema="formSchema"
          :data="data"
          :action="pageUrl"
          method="post"
          submit-label="Save"
          :cancel-url="pageUrl"
        />
      </div>
    </div>
  </AdminLayout>
</template>
