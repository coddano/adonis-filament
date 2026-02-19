<script setup lang="ts">
import { computed, inject } from 'vue'
import { usePage, Link } from '@inertiajs/vue3'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import NavigationItem from './NavigationItem.vue'
import { LayoutDashboard, ChevronsLeft, ChevronsRight, X } from 'lucide-vue-next'

interface Props {
  open: boolean
  collapsed: boolean
  isMobile: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  toggleCollapse: []
}>()

const page = usePage()

const navigation = computed(() => (page.props as any).filament?.navigation || [])
const currentPanel = computed(() => (page.props as any).filament?.currentPanel)
const theme = computed(() => (page.props as any).filament?.theme || {})

// Get dark mode state for logo variant
const isDark = inject<{ value: boolean }>('isDark')

// Computed logo URL based on dark mode
const logoUrl = computed(() => {
  if (!theme.value.logo) return null
  return isDark?.value ? theme.value.logo.dark || theme.value.logo.light : theme.value.logo.light
})

const brandName = computed(() => theme.value.brandName || 'Filament')
const logoHeight = computed(() => theme.value.logo?.height || '2rem')

const sidebarWidth = computed(() => {
  if (!props.open) return 'w-0'
  return props.collapsed ? 'w-16' : 'w-64'
})
</script>

<template>
  <aside
    :class="[
      'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 lg:relative',
      sidebarWidth,
      { 'overflow-hidden': !open },
    ]"
  >
    <!-- Header -->
    <div class="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="!collapsed" class="flex items-center gap-3">
          <!-- Logo from theme or default icon -->
          <template v-if="logoUrl">
            <img
              :src="logoUrl"
              :alt="brandName"
              :style="{ height: logoHeight }"
              class="object-contain"
            />
          </template>
          <template v-else>
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span class="text-sm font-bold text-primary-foreground">{{
                brandName.charAt(0)
              }}</span>
            </div>
            <span class="text-lg font-semibold text-sidebar-foreground">
              {{ brandName }}
            </span>
          </template>
        </div>
      </Transition>

      <!-- Mobile Close / Collapse Toggle -->
      <Button
        v-if="isMobile"
        variant="ghost"
        size="icon"
        class="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
        @click="emit('close')"
      >
        <X class="h-4 w-4" />
      </Button>
      <Button
        v-else
        variant="ghost"
        size="icon"
        class="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
        @click="emit('toggleCollapse')"
      >
        <ChevronsLeft v-if="!collapsed" class="h-4 w-4" />
        <ChevronsRight v-else class="h-4 w-4" />
      </Button>
    </div>

    <!-- Navigation -->
    <ScrollArea class="flex-1 py-4">
      <nav class="space-y-6 px-3">
        <!-- Dashboard Link -->
        <TooltipProvider :delay-duration="0">
          <Tooltip>
            <TooltipTrigger as-child>
              <Link
                v-if="currentPanel"
                :href="currentPanel.path"
                :class="[
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  $page.url === currentPanel.path || $page.url === currentPanel.path + '/'
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  collapsed ? 'justify-center' : '',
                ]"
              >
                <LayoutDashboard class="h-5 w-5 shrink-0" />
                <span v-if="!collapsed">Dashboard</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent v-if="collapsed" side="right"> Dashboard </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Separator class="bg-sidebar-border" />

        <!-- Navigation Groups -->
        <div v-for="group in navigation" :key="group.label" class="space-y-1">
          <p
            v-if="!collapsed"
            class="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60"
          >
            {{ group.label }}
          </p>
          <NavigationItem
            v-for="item in group.items"
            :key="item.url"
            :item="item"
            :collapsed="collapsed"
          />
        </div>
      </nav>
    </ScrollArea>

    <!-- Footer -->
    <div class="border-t border-sidebar-border p-3">
      <div v-if="!collapsed" class="text-xs text-sidebar-foreground/50 text-center">
        Filament Admin v0.1
      </div>
    </div>
  </aside>
</template>
