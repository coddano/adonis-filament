<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { router } from '@inertiajs/vue3'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Search, FileText, Users, Cog, LayoutDashboard, PlusCircle } from 'lucide-vue-next'
import { useDebounceFn } from '@vueuse/core'

const open = ref(false)
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const loading = ref(false)

onMounted(() => {
  const down = (e: KeyboardEvent) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      open.value = !open.value
    }
  }
  document.addEventListener('keydown', down)
  onUnmounted(() => document.removeEventListener('keydown', down))
})

// Navigation helpers
const navigate = (url: string) => {
  open.value = false
  router.visit(url)
}

// Recherche dynamique
const performSearch = useDebounceFn(async (query: string) => {
  if (!query || query.length < 2) {
    searchResults.value = []
    return
  }

  loading.value = true
  try {
    const response = await fetch(`/admin/global-search?query=${encodeURIComponent(query)}`)
    searchResults.value = await response.json()
  } catch (e) {
    console.error('Search failed', e)
  } finally {
    loading.value = false
  }
}, 300)

watch(searchQuery, (val) => performSearch(val))

// Liens statiques pour navigation rapide
const pages = [
  { label: 'Dashboard', icon: LayoutDashboard, url: '/admin', group: 'Pages' },
  { label: 'Settings', icon: Cog, url: '/admin/settings', group: 'Pages' },
  { label: 'MFA Security', icon: Cog, url: '/admin/security/mfa', group: 'Pages' },
]

const quickActions = [
  { label: 'New Post', icon: PlusCircle, url: '/admin/posts/create' },
  { label: 'New User', icon: PlusCircle, url: '/admin/users/create' },
]
</script>

<template>
  <CommandDialog :open="open" @update:open="open = $event">
    <CommandInput
      placeholder="Search everywhere..."
      :value="searchQuery"
      @input="searchQuery = $event.target.value"
    />
    <CommandList>
      <CommandEmpty v-if="!loading">
        {{ searchQuery.length > 0 ? 'No results.' : 'Start typing to search...' }}
      </CommandEmpty>
      <CommandEmpty v-else>Searching...</CommandEmpty>

      <!-- Dynamic results -->
      <template v-if="searchQuery.length >= 2">
        <CommandGroup v-for="group in searchResults" :key="group.group" :heading="group.group">
          <CommandItem
            v-for="item in group.items"
            :key="item.url"
            :value="item.title"
            @select="navigate(item.url)"
          >
            <FileText
              v-if="group.group === 'Posts' || group.group === 'Articles'"
              class="mr-2 h-4 w-4"
            />
            <Users
              v-else-if="group.group === 'Users' || group.group === 'Utilisateurs'"
              class="mr-2 h-4 w-4"
            />
            <Search v-else class="mr-2 h-4 w-4" />

            <div class="flex flex-col">
              <span>{{ item.title }}</span>
              <span class="text-xs text-muted-foreground">{{ item.description }}</span>
            </div>
          </CommandItem>
        </CommandGroup>
      </template>

      <!-- Static actions when not searching -->
      <template v-else>
        <CommandGroup heading="Pages">
          <CommandItem
            v-for="page in pages"
            :key="page.url"
            :value="page.label"
            @select="navigate(page.url)"
          >
            <component :is="page.icon" class="mr-2 h-4 w-4" />
            <span>{{ page.label }}</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick Actions">
          <CommandItem
            v-for="action in quickActions"
            :key="action.url"
            :value="action.label"
            @select="navigate(action.url)"
          >
            <component :is="action.icon" class="mr-2 h-4 w-4" />
            <span>{{ action.label }}</span>
          </CommandItem>
        </CommandGroup>
      </template>
    </CommandList>
  </CommandDialog>
</template>
