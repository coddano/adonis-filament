<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { router } from '@inertiajs/vue3'
import { useDebounceFn } from '@vueuse/core'
import { useToast } from '@/composables/useToast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import ConfirmModal from '@/components/admin/modals/ConfirmModal.vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Download,
  Filter,
  X,
  Copy,
  RotateCcw,
  Upload,
} from 'lucide-vue-next'

// Composants de colonnes
import TextColumnCell from './columns/TextColumnCell.vue'
import BooleanColumnCell from './columns/BooleanColumnCell.vue'
import DateColumnCell from './columns/DateColumnCell.vue'
import BadgeColumnCell from './columns/BadgeColumnCell.vue'

interface Props {
  tableSchema: any
  records: any
  queryParams: any
  resourceSlug: string
  panelPath: string
}

const props = defineProps<Props>()
const toast = useToast()

// Local state
const search = ref(props.queryParams?.search || '')
const selectedIds = ref<(string | number)[]>([])
const showFilters = ref(false)
const activeFilters = ref<Record<string, any>>(props.queryParams?.filters || {})
const trashedMode = ref<'without' | 'with' | 'only'>(
  props.queryParams?.trashed === 'with' || props.queryParams?.trashed === 'only'
    ? props.queryParams.trashed
    : 'without'
)

// Modal state
const confirmModalOpen = ref(false)
const confirmModalConfig = ref({
  title: '',
  message: '',
  variant: 'danger' as 'danger' | 'warning' | 'default',
  icon: 'delete' as 'delete' | 'warning' | 'none',
  confirmLabel: 'Confirm',
  onConfirm: () => {},
})
const actionLoading = ref(false)
const importInputRef = ref<HTMLInputElement | null>(null)
const pendingImportAction = ref<any>(null)

// Computed
const data = computed(() => props.records?.data || [])
const meta = computed(() => props.records?.meta || {})
const columns = computed(() => props.tableSchema?.columns?.filter((c: any) => !c.hidden) || [])
const supportsSoftDeletes = computed(() => props.tableSchema?.supportsSoftDeletes === true)
const allSelected = computed(
  () => data.value.length > 0 && selectedIds.value.length === data.value.length
)
const someSelected = computed(
  () => selectedIds.value.length > 0 && selectedIds.value.length < data.value.length
)

// Debounced search
const debouncedSearch = useDebounceFn(() => {
  reloadTable({ search: search.value, page: 1 })
}, 300)

// Watch search
watch(search, () => {
  debouncedSearch()
})

watch(
  () => props.queryParams?.trashed,
  (value) => {
    trashedMode.value = value === 'with' || value === 'only' ? value : 'without'
  }
)

// Methods
function reloadTable(params: Record<string, any> = {}) {
  const currentParams = {
    page: props.queryParams?.page || 1,
    perPage: props.queryParams?.perPage || 10,
    search: props.queryParams?.search || '',
    sortColumn: props.queryParams?.sortColumn || '',
    sortDirection: props.queryParams?.sortDirection || 'desc',
    filters: props.queryParams?.filters || {},
    trashed: props.queryParams?.trashed || 'without',
    ...params,
  }

  router.get(`${props.panelPath}/${props.resourceSlug}`, currentParams, {
    preserveState: true,
    preserveScroll: true,
    only: ['records', 'queryParams'],
  })
}

function changeTrashedMode(value: any) {
  trashedMode.value = value === 'with' || value === 'only' ? value : 'without'
  selectedIds.value = []
  reloadTable({ trashed: trashedMode.value, page: 1 })
}

function sort(column: string) {
  const currentSort = props.queryParams?.sortColumn
  const currentDir = props.queryParams?.sortDirection || 'desc'

  let direction = 'asc'
  if (currentSort === column && currentDir === 'asc') {
    direction = 'desc'
  }

  reloadTable({ sortColumn: column, sortDirection: direction })
}

function goToPage(page: number) {
  reloadTable({ page })
}

function changePerPage(value: any) {
  reloadTable({ perPage: parseInt(String(value)), page: 1 })
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = data.value.map((r: any) => r.id)
  }
}

function toggleSelect(id: string | number) {
  const index = selectedIds.value.indexOf(id)
  if (index > -1) {
    selectedIds.value.splice(index, 1)
  } else {
    selectedIds.value.push(id)
  }
}

function isSelected(id: string | number) {
  return selectedIds.value.includes(id)
}

function applyFilter(name: string, value: any) {
  activeFilters.value[name] = value
  reloadTable({ filters: activeFilters.value, page: 1 })
}

function clearFilter(name: string) {
  delete activeFilters.value[name]
  reloadTable({ filters: activeFilters.value, page: 1 })
}

function clearAllFilters() {
  activeFilters.value = {}
  reloadTable({ filters: {}, page: 1 })
}

// Show confirmation modal
function showConfirmModal(config: typeof confirmModalConfig.value) {
  confirmModalConfig.value = config
  confirmModalOpen.value = true
}

function isRecordTrashed(record: any) {
  return Boolean(record?.deletedAt || record?.deleted_at)
}

function isActionVisible(action: any, record: any) {
  if (!supportsSoftDeletes.value) return true

  const trashed = isRecordTrashed(record)

  if (trashed) {
    return !['edit', 'delete', 'clone'].includes(action.type)
  }

  return !['restore', 'force-delete'].includes(action.type)
}

function getVisibleActions(record: any) {
  return (props.tableSchema?.actions || []).filter((action: any) => isActionVisible(action, record))
}

// Actions
function handleAction(action: any, record: any) {
  const url = `${props.panelPath}/${props.resourceSlug}/${record.id}`

  if (action.type === 'edit') {
    router.get(`${url}/edit`)
  } else if (action.type === 'view') {
    router.get(url)
  } else if (action.type === 'clone') {
    // Clone avec confirmation optionnelle
    actionLoading.value = true
    fetch(`${url}/clone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          toast.success('Duplicated successfully', data.message)
          // Optional: redirect to cloned record edit page
          router.visit(data.redirectUrl)
        }
      })
      .catch(() => {
        toast.error('Error', 'Unable to duplicate record')
      })
      .finally(() => {
        actionLoading.value = false
      })
  } else if (action.type === 'delete') {
    if (action.requiresConfirmation) {
      showConfirmModal({
        title: action.confirmationTitle || 'Delete this item?',
        message: action.confirmationMessage || 'This action is irreversible.',
        variant: 'danger',
        icon: 'delete',
        confirmLabel: 'Delete',
        onConfirm: () => {
          actionLoading.value = true
          router.delete(url, {
            onSuccess: () => {
              toast.success('Deleted', 'Record deleted successfully')
              confirmModalOpen.value = false
            },
            onError: () => {
              toast.error('Error', 'Unable to delete record')
            },
            onFinish: () => {
              actionLoading.value = false
            },
          })
        },
      })
    } else {
      router.delete(url, {
        onSuccess: () => {
          toast.success('Deleted', 'Record deleted successfully')
        },
      })
    }
  } else if (action.type === 'restore') {
    const executeRestore = () => {
      actionLoading.value = true
      fetch(`${url}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            toast.success('Restored', 'Record restored successfully')
            confirmModalOpen.value = false
            reloadTable()
          }
        })
        .catch(() => {
          toast.error('Error', 'Unable to restore record')
        })
        .finally(() => {
          actionLoading.value = false
        })
    }

    if (action.requiresConfirmation) {
      showConfirmModal({
        title: action.confirmationTitle || 'Restore this item?',
        message: action.confirmationMessage || 'This record will be active again.',
        variant: 'default',
        icon: 'none',
        confirmLabel: action.label || 'Restore',
        onConfirm: executeRestore,
      })
    } else {
      executeRestore()
    }
  } else if (action.type === 'force-delete') {
    showConfirmModal({
      title: action.confirmationTitle || 'Delete permanently?',
      message: action.confirmationMessage || 'This action is irreversible.',
      variant: 'danger',
      icon: 'delete',
      confirmLabel: action.label || 'Delete permanently',
      onConfirm: () => {
        actionLoading.value = true
        fetch(`${url}/force`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              toast.success('Deleted', 'Record deleted permanently')
              confirmModalOpen.value = false
              reloadTable()
            }
          })
          .catch(() => {
            toast.error('Error', 'Unable to permanently delete this record')
          })
          .finally(() => {
            actionLoading.value = false
          })
      },
    })
  }
}

function handleBulkAction(action: any) {
  if (action.type === 'bulk-delete') {
    const forceDeleteMode = trashedMode.value === 'only'

    showConfirmModal({
      title:
        action.confirmationTitle ||
        (forceDeleteMode ? 'Delete selected items permanently?' : 'Delete selected items?'),
      message:
        action.confirmationMessage ||
        (forceDeleteMode
          ? `${selectedIds.value.length} item(s) will be permanently deleted. This action is irreversible.`
          : `${selectedIds.value.length} item(s) will be moved to trash.`),
      variant: 'danger',
      icon: 'delete',
      confirmLabel: forceDeleteMode
        ? `Delete permanently (${selectedIds.value.length})`
        : `Delete (${selectedIds.value.length})`,
      onConfirm: () => {
        actionLoading.value = true
        fetch(`${props.panelPath}/${props.resourceSlug}/bulk`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: JSON.stringify({
            ids: selectedIds.value,
            trashed: trashedMode.value,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              const isForce = data.mode === 'force' || forceDeleteMode
              const message = isForce
                ? `${data.deletedCount} item(s) permanently deleted`
                : `${data.deletedCount} item(s) moved to trash`
              toast.success('Deletion completed', message)
              selectedIds.value = []
              confirmModalOpen.value = false
              reloadTable()
            }
          })
          .catch(() => {
            toast.error('Error', 'Unable to delete items')
          })
          .finally(() => {
            actionLoading.value = false
          })
      },
    })
  } else if (action.type === 'export') {
    launchExport()
  }
}

function launchExport() {
  const params = new URLSearchParams({
    search: search.value,
    trashed: trashedMode.value,
    ...Object.fromEntries(
      Object.entries(activeFilters.value).map(([k, v]) => [`filters[${k}]`, String(v)])
    ),
  })
  window.open(`${props.panelPath}/${props.resourceSlug}/export/csv?${params}`, '_blank')
  toast.info('Export started', 'Download will start shortly...')
}

function handleHeaderAction(action: any) {
  if (action.type === 'export') {
    launchExport()
    return
  }

  if (action.type === 'import') {
    pendingImportAction.value = action
    if (importInputRef.value) {
      importInputRef.value.value = ''
      importInputRef.value.click()
    }
  }
}

async function handleImportFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  const action = pendingImportAction.value

  if (!file || !action) return

  const allowedExtensions = Array.isArray(action.acceptedExtensions)
    ? action.acceptedExtensions.map((ext: string) => String(ext).toLowerCase())
    : ['csv']
  const extension = (file.name.split('.').pop() || '').toLowerCase()

  if (allowedExtensions.length > 0 && extension && !allowedExtensions.includes(extension)) {
    toast.error('Invalid format', `Allowed formats: ${allowedExtensions.join(', ')}`)
    input.value = ''
    pendingImportAction.value = null
    return
  }

  const formData = new FormData()
  formData.append('file', file)
  if (action.maxRows) {
    formData.append('maxRows', String(action.maxRows))
  }

  actionLoading.value = true

  try {
    const res = await fetch(`${props.panelPath}/${props.resourceSlug}/import`, {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: formData,
    })

    const payload = await res.json()

    if (!res.ok) {
      toast.error('Import failed', payload?.message || 'Unable to import file')
      return
    }

    toast.success(
      'Import complete',
      `${payload.importedCount || 0} imported, ${payload.skippedCount || 0} skipped`
    )

    if (Array.isArray(payload.errors) && payload.errors.length > 0) {
      toast.info('Some rows failed', payload.errors[0])
    }

    reloadTable()
  } catch {
    toast.error('Import failed', 'Unable to import file')
  } finally {
    actionLoading.value = false
    pendingImportAction.value = null
    input.value = ''
  }
}

// Get column component
function getColumnComponent(type: string) {
  switch (type) {
    case 'boolean':
      return BooleanColumnCell
    case 'date':
      return DateColumnCell
    case 'badge':
      return BadgeColumnCell
    default:
      return TextColumnCell
  }
}

// Icons for actions
function getActionIcon(type: string) {
  switch (type) {
    case 'edit':
      return Pencil
    case 'view':
      return Eye
    case 'delete':
      return Trash2
    case 'force-delete':
      return Trash2
    case 'restore':
      return RotateCcw
    case 'clone':
      return Copy
    case 'export':
      return Download
    case 'import':
      return Upload
    default:
      return MoreHorizontal
  }
}

// Helper to get nested value (dot notation)
function getCellValue(record: any, path: string) {
  return path.split('.').reduce((obj, key) => obj && obj[key], record)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <!-- Search -->
      <div class="relative flex-1 max-w-md">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          v-model="search"
          :placeholder="tableSchema?.searchPlaceholder || 'Search...'"
          class="pl-10"
        />
      </div>

      <div class="flex items-center gap-2">
        <Select
          v-if="supportsSoftDeletes"
          :modelValue="trashedMode"
          @update:modelValue="changeTrashedMode"
        >
          <SelectTrigger class="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="without">Active only</SelectItem>
            <SelectItem value="with">Active + deleted</SelectItem>
            <SelectItem value="only">Trash only</SelectItem>
          </SelectContent>
        </Select>

        <!-- Filter toggle -->
        <Button
          v-if="tableSchema?.filters?.length > 0"
          variant="outline"
          size="sm"
          @click="showFilters = !showFilters"
        >
          <Filter class="h-4 w-4 mr-2" />
          Filters
          <span
            v-if="Object.keys(activeFilters).length > 0"
            class="ml-2 bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full text-xs"
          >
            {{ Object.keys(activeFilters).length }}
          </span>
        </Button>

        <!-- Bulk actions -->
        <DropdownMenu v-if="selectedIds.length > 0 && tableSchema?.bulkActions?.length > 0">
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" class="gap-2">
              <span class="bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-xs">
                {{ selectedIds.length }}
              </span>
              selected
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              v-for="action in tableSchema.bulkActions"
              :key="action.name"
              @click="handleBulkAction(action)"
              :class="{ 'text-destructive': action.color === 'danger' }"
            >
              <Trash2 v-if="action.type === 'bulk-delete'" class="h-4 w-4 mr-2" />
              <Download v-else-if="action.type === 'export'" class="h-4 w-4 mr-2" />
              {{ action.label }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <!-- Header actions -->
        <DropdownMenu v-if="tableSchema?.headerActions?.length > 0">
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm"> Actions </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              v-for="action in tableSchema.headerActions"
              :key="action.name"
              @click="handleHeaderAction(action)"
              :class="{ 'text-destructive': action.color === 'danger' }"
            >
              <component :is="getActionIcon(action.type)" class="h-4 w-4 mr-2" />
              {{ action.label }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <!-- Filters panel -->
    <div
      v-if="showFilters && tableSchema?.filters?.length > 0"
      class="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg border"
    >
      <div v-for="filter in tableSchema.filters" :key="filter.name" class="flex items-center gap-2">
        <Select
          v-if="filter.type === 'select' || filter.type === 'boolean'"
          :modelValue="activeFilters[filter.name] ?? ''"
          @update:modelValue="(v) => (v ? applyFilter(filter.name, v) : clearFilter(filter.name))"
        >
          <SelectTrigger class="w-[180px]">
            <SelectValue :placeholder="filter.label" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            <template v-if="filter.type === 'boolean'">
              <SelectItem value="true">{{ filter.trueLabel || 'Yes' }}</SelectItem>
              <SelectItem value="false">{{ filter.falseLabel || 'No' }}</SelectItem>
            </template>
            <template v-else>
              <SelectItem
                v-for="option in filter.options"
                :key="option.value"
                :value="String(option.value)"
              >
                {{ option.label }}
              </SelectItem>
            </template>
          </SelectContent>
        </Select>
      </div>

      <Button
        v-if="Object.keys(activeFilters).length > 0"
        variant="ghost"
        size="sm"
        @click="clearAllFilters"
      >
        <X class="h-4 w-4 mr-1" />
        Clear all
      </Button>
    </div>

    <!-- Table -->
    <div class="rounded-xl border overflow-hidden bg-card shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-muted/50 border-b">
            <tr>
              <!-- Checkbox column -->
              <th v-if="tableSchema?.selectable" class="w-12 px-4 py-3">
                <Checkbox
                  :checked="allSelected"
                  :indeterminate="someSelected"
                  @update:checked="toggleSelectAll"
                />
              </th>

              <!-- Data columns -->
              <th
                v-for="column in columns"
                :key="column.name"
                class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                :style="column.width ? { width: column.width } : {}"
                :class="{
                  'text-right': column.alignRight,
                  'cursor-pointer hover:text-foreground transition-colors': column.sortable,
                }"
                @click="column.sortable && sort(column.name)"
              >
                <div class="flex items-center gap-1" :class="{ 'justify-end': column.alignRight }">
                  <span>{{ column.label }}</span>
                  <template v-if="column.sortable">
                    <ChevronUp
                      v-if="
                        queryParams?.sortColumn === column.name &&
                        queryParams?.sortDirection === 'asc'
                      "
                      class="h-4 w-4 text-primary"
                    />
                    <ChevronDown
                      v-else-if="
                        queryParams?.sortColumn === column.name &&
                        queryParams?.sortDirection === 'desc'
                      "
                      class="h-4 w-4 text-primary"
                    />
                    <div v-else class="h-4 w-4" />
                  </template>
                </div>
              </th>

              <!-- Actions column -->
              <th v-if="tableSchema?.actions?.length > 0" class="w-12 px-4 py-3"></th>
            </tr>
          </thead>

          <tbody class="divide-y">
            <tr
              v-for="record in data"
              :key="record.id"
              class="group transition-colors"
              :class="{
                'hover:bg-muted/50': tableSchema?.hoverable,
                'bg-primary/5': isSelected(record.id),
                'opacity-65': isRecordTrashed(record),
              }"
            >
              <!-- Checkbox -->
              <td v-if="tableSchema?.selectable" class="px-4 py-3">
                <Checkbox
                  :checked="isSelected(record.id)"
                  @update:checked="() => toggleSelect(record.id)"
                />
              </td>

              <!-- Data cells -->
              <td
                v-for="column in columns"
                :key="column.name"
                class="px-4 py-3 text-sm"
                :class="{ 'text-right': column.alignRight }"
              >
                <component
                  :is="getColumnComponent(column.type)"
                  :value="getCellValue(record, column.name)"
                  :column="column"
                />
              </td>

              <!-- Actions -->
              <td v-if="tableSchema?.actions?.length > 0" class="px-4 py-3">
                <DropdownMenu v-if="getVisibleActions(record).length > 0">
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      class="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal class="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <template
                      v-for="(action, index) in getVisibleActions(record)"
                      :key="action.name"
                    >
                      <DropdownMenuSeparator
                        v-if="['delete', 'force-delete'].includes(action.type) && Number(index) > 0"
                      />
                      <DropdownMenuItem
                        @click="handleAction(action, record)"
                        :class="{
                          'text-destructive focus:text-destructive': action.color === 'danger',
                        }"
                      >
                        <component :is="getActionIcon(action.type)" class="h-4 w-4 mr-2" />
                        {{ action.label }}
                      </DropdownMenuItem>
                    </template>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>

            <!-- Empty state -->
            <tr v-if="data.length === 0">
              <td
                :colspan="
                  columns.length +
                  (tableSchema?.selectable ? 1 : 0) +
                  (tableSchema?.actions?.length > 0 ? 1 : 0)
                "
                class="px-4 py-12 text-center"
              >
                <div class="flex flex-col items-center gap-2">
                  <div class="rounded-full bg-muted p-3">
                    <Search class="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p class="font-medium text-muted-foreground">
                    {{ tableSchema?.emptyMessage || 'No results found' }}
                  </p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    <div
      v-if="tableSchema?.paginated && meta?.lastPage > 1"
      class="flex items-center justify-between"
    >
      <div class="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Show</span>
        <Select :modelValue="String(queryParams?.perPage || 10)" @update:modelValue="changePerPage">
          <SelectTrigger class="w-[70px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="option in tableSchema?.perPageOptions || [10, 25, 50, 100]"
              :key="option"
              :value="String(option)"
            >
              {{ option }}
            </SelectItem>
          </SelectContent>
        </Select>
        <span>of {{ meta?.total }} results</span>
      </div>

      <div class="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          :disabled="meta?.currentPage <= 1"
          @click="goToPage(meta?.currentPage - 1)"
        >
          Previous
        </Button>

        <template v-for="page in meta?.lastPage" :key="page">
          <Button
            v-if="
              page === 1 ||
              page === meta?.lastPage ||
              (page >= meta?.currentPage - 1 && page <= meta?.currentPage + 1)
            "
            variant="outline"
            size="sm"
            :class="{
              'bg-primary text-primary-foreground hover:bg-primary/90': page === meta?.currentPage,
            }"
            @click="goToPage(page)"
          >
            {{ page }}
          </Button>
          <span
            v-else-if="page === meta?.currentPage - 2 || page === meta?.currentPage + 2"
            class="px-2 text-muted-foreground"
          >
            ...
          </span>
        </template>

        <Button
          variant="outline"
          size="sm"
          :disabled="meta?.currentPage >= meta?.lastPage"
          @click="goToPage(meta?.currentPage + 1)"
        >
          Next
        </Button>
      </div>
    </div>

    <!-- Confirm Modal -->
    <ConfirmModal
      v-model:open="confirmModalOpen"
      :title="confirmModalConfig.title"
      :message="confirmModalConfig.message"
      :variant="confirmModalConfig.variant"
      :icon="confirmModalConfig.icon"
      :confirmLabel="confirmModalConfig.confirmLabel"
      :loading="actionLoading"
      @confirm="confirmModalConfig.onConfirm"
      @cancel="confirmModalOpen = false"
    />

    <input
      ref="importInputRef"
      type="file"
      class="hidden"
      accept=".csv,text/csv"
      @change="handleImportFileChange"
    />
  </div>
</template>
