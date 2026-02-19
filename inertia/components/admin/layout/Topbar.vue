<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePage, router } from '@inertiajs/vue3'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import ThemeToggle from './ThemeToggle.vue'
import { Menu, User, LogOut, Settings, Bell } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'

interface Props {
  sidebarOpen: boolean
  isDark: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  toggleSidebar: []
  toggleDark: []
}>()

const page = usePage<{ auth?: { user?: Record<string, any> } }>()
const toast = useToast()
const switchingTenant = ref(false)

const user = computed(() => page.props.auth?.user)
const filamentProps = computed(() => (page.props as any).filament || {})
const currentPanelPath = computed(() => filamentProps.value.currentPanel?.path || '/admin')
const currentTenant = computed(
  () => filamentProps.value.tenancy?.current || filamentProps.value.tenant || null
)
const availableTenants = computed(() => {
  const list = filamentProps.value.tenancy?.available
  if (Array.isArray(list)) return list
  return currentTenant.value ? [currentTenant.value] : []
})
const tenantSelectValue = computed(() => {
  return currentTenant.value?.id ? String(currentTenant.value.id) : '__all__'
})

const userInitials = computed(() => {
  if (!user.value) return 'U'
  const name = (user.value as any).fullName || (user.value as any).email || 'User'
  return name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

const switchTenant = async (value: any) => {
  if (switchingTenant.value) return

  const selectedValue = String(value || '')
  if (!selectedValue) return

  switchingTenant.value = true

  try {
    const isClear = selectedValue === '__all__'
    const endpoint = isClear
      ? `${currentPanelPath.value}/tenancy/clear`
      : `${currentPanelPath.value}/tenancy/switch`

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: isClear ? JSON.stringify({}) : JSON.stringify({ tenantId: Number(selectedValue) }),
    })

    const payload = await res.json()
    if (!res.ok || !payload?.success) {
      throw new Error(payload?.message || 'Unable to switch tenant')
    }

    toast.success(
      'Tenant updated',
      payload?.tenant?.name ? `Active tenant: ${payload.tenant.name}` : 'Tenant context cleared'
    )
    router.reload()
  } catch (error: any) {
    toast.error('Error', error?.message || 'Unable to switch tenant')
  } finally {
    switchingTenant.value = false
  }
}
</script>

<template>
  <header
    class="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60"
  >
    <!-- Left Side -->
    <div class="flex items-center gap-4">
      <!-- Mobile Menu Button -->
      <Button variant="ghost" size="icon" class="lg:hidden" @click="emit('toggleSidebar')">
        <Menu class="h-5 w-5" />
      </Button>

      <!-- Breadcrumbs would go here -->
      <div class="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
        <span>Admin</span>
        <span>/</span>
        <span class="text-foreground font-medium">Dashboard</span>
      </div>
    </div>

    <!-- Right Side -->
    <div class="flex items-center gap-3">
      <Select
        v-if="availableTenants.length > 0"
        :modelValue="tenantSelectValue"
        @update:modelValue="switchTenant"
        :disabled="switchingTenant"
      >
        <SelectTrigger class="w-[220px] h-9">
          <SelectValue placeholder="Select a tenant" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-if="user && (user as any).isAdmin" value="__all__">
            All tenants
          </SelectItem>
          <SelectItem
            v-for="tenant in availableTenants"
            :key="tenant.id"
            :value="String(tenant.id)"
          >
            {{ tenant.name }}
          </SelectItem>
        </SelectContent>
      </Select>

      <!-- Notifications -->
      <Button variant="ghost" size="icon" class="relative">
        <Bell class="h-5 w-5" />
        <span
          class="absolute right-1 top-1 flex h-2 w-2 items-center justify-center rounded-full bg-primary"
        />
      </Button>

      <!-- Theme Toggle -->
      <ThemeToggle :is-dark="isDark" @toggle="emit('toggleDark')" />

      <!-- User Menu -->
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            variant="ghost"
            class="relative h-9 w-9 rounded-full ring-2 ring-primary/20 transition-all hover:ring-primary/40"
          >
            <Avatar class="h-8 w-8">
              <AvatarImage
                v-if="user && (user as any).avatar"
                :src="(user as any).avatar"
                :alt="userInitials"
              />
              <AvatarFallback class="bg-primary/10 text-primary text-xs font-medium">
                {{ userInitials }}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-56" align="end">
          <DropdownMenuLabel class="font-normal">
            <div class="flex flex-col space-y-1">
              <p class="text-sm font-medium leading-none">
                {{ user ? (user as any).fullName || (user as any).email : 'User' }}
              </p>
              <p class="text-xs leading-none text-muted-foreground">
                {{ user ? (user as any).email : '' }}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <User class="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem @click="router.visit(`${currentPanelPath}/security/mfa`)">
            <Settings class="mr-2 h-4 w-4" />
            <span>MFA Security</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem class="text-destructive focus:text-destructive">
            <LogOut class="mr-2 h-4 w-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </header>
</template>
