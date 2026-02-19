<script setup lang="ts">
import { computed } from 'vue'
import { usePage, Head, router } from '@inertiajs/vue3'
import { AdminLayout } from '@/components/admin/layout'
import { FormRenderer } from '@/components/admin/forms'
import { Button } from '@/components/ui/button'
import { ChevronRight, Eye, Pencil } from 'lucide-vue-next'

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
  permissions?: {
    canUpdate?: boolean
  }
}>()

const page = usePage()

const baseUrl = computed(() => {
  const panelPath = (page.props as any).filament?.currentPanel?.path || '/admin'
  return `${panelPath}/${props.resource.slug}`
})

const editUrl = computed(() => `${baseUrl.value}/${props.record.id}/edit`)
const recordTitle = computed(() => {
  return props.record.fullName || props.record.name || props.record.email || `#${props.record.id}`
})
const isTrashed = computed(() => Boolean(props.record.deletedAt || props.record.deleted_at))
const canEdit = computed(() => Boolean(props.permissions?.canUpdate) && !isTrashed.value)
const breadcrumbs = computed(() => [
  { label: props.resource.label, href: baseUrl.value },
  { label: `View ${props.resource.singularLabel}` },
])

function goToEdit() {
  router.visit(editUrl.value)
}
</script>

<template>
  <Head :title="`View ${recordTitle}`" />

  <AdminLayout>
    <div class="space-y-6">
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

      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
            <Eye class="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 class="text-2xl font-bold tracking-tight">
              {{ recordTitle }}
            </h1>
            <p class="text-muted-foreground">
              Details of {{ resource.singularLabel.toLowerCase() }}
            </p>
          </div>
        </div>

        <Button v-if="canEdit" class="gap-2" @click="goToEdit">
          <Pencil class="h-4 w-4" />
          Edit
        </Button>
      </div>

      <FormRenderer
        :schema="formSchema"
        :data="record"
        :action="`${baseUrl}/${record.id}`"
        method="put"
        :cancel-url="baseUrl"
        :readonly="true"
      />
    </div>
  </AdminLayout>
</template>
