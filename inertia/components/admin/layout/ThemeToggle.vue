<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Sun, Moon } from 'lucide-vue-next'

interface Props {
  isDark: boolean
}

defineProps<Props>()
const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <TooltipProvider :delay-duration="300">
    <Tooltip>
      <TooltipTrigger as-child>
        <Button
          variant="ghost"
          size="icon"
          class="relative overflow-hidden"
          @click="emit('toggle')"
        >
          <Transition
            enter-active-class="transition-all duration-300"
            enter-from-class="opacity-0 rotate-90 scale-0"
            enter-to-class="opacity-100 rotate-0 scale-100"
            leave-active-class="transition-all duration-300 absolute"
            leave-from-class="opacity-100 rotate-0 scale-100"
            leave-to-class="opacity-0 -rotate-90 scale-0"
          >
            <Moon v-if="isDark" class="h-5 w-5" />
            <Sun v-else class="h-5 w-5" />
          </Transition>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {{ isDark ? 'Mode clair' : 'Mode sombre' }}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
