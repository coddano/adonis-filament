<script setup lang="ts">
import { Link } from '@inertiajs/vue3'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  FileText,
  Settings,
  ShoppingBag,
  BarChart3,
  Mail,
  Calendar,
  Folder,
  CircleDot,
} from 'lucide-vue-next'

interface NavigationItem {
  label: string
  icon: string
  url: string
  isActive?: boolean
  badge?: string | number
}

interface Props {
  item: NavigationItem
  collapsed: boolean
}

const props = defineProps<Props>()

// Map icon names to components
const iconMap: Record<string, any> = {
  'heroicon-o-users': Users,
  'users': Users,
  'heroicon-o-document': FileText,
  'document': FileText,
  'heroicon-o-cog': Settings,
  'settings': Settings,
  'heroicon-o-shopping-bag': ShoppingBag,
  'shopping': ShoppingBag,
  'heroicon-o-chart-bar': BarChart3,
  'chart': BarChart3,
  'heroicon-o-mail': Mail,
  'mail': Mail,
  'heroicon-o-calendar': Calendar,
  'calendar': Calendar,
  'heroicon-o-folder': Folder,
  'folder': Folder,
  'circle': CircleDot,
}

const IconComponent = iconMap[props.item.icon] || CircleDot
</script>

<template>
  <TooltipProvider :delay-duration="0">
    <Tooltip>
      <TooltipTrigger as-child>
        <Link
          :href="item.url"
          :class="[
            'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
            item.isActive
              ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            collapsed ? 'justify-center' : '',
          ]"
        >
          <component
            :is="IconComponent"
            :class="[
              'h-5 w-5 shrink-0 transition-transform duration-200',
              item.isActive ? '' : 'group-hover:scale-110',
            ]"
          />
          <span v-if="!collapsed" class="flex-1 truncate">
            {{ item.label }}
          </span>
          <Badge
            v-if="!collapsed && item.badge"
            variant="secondary"
            class="ml-auto h-5 px-1.5 text-xs"
          >
            {{ item.badge }}
          </Badge>
        </Link>
      </TooltipTrigger>
      <TooltipContent v-if="collapsed" side="right" :side-offset="10">
        <div class="flex items-center gap-2">
          <span>{{ item.label }}</span>
          <Badge v-if="item.badge" variant="secondary" class="h-5 px-1.5 text-xs">
            {{ item.badge }}
          </Badge>
        </div>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
