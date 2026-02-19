<script setup lang="ts">
import { computed } from 'vue'
import { Check, X } from 'lucide-vue-next'

interface Props {
  value: any
  column: {
    trueLabel?: string
    falseLabel?: string
    trueIcon?: string
    falseIcon?: string
    trueColor?: string
    falseColor?: string
  }
}

const props = defineProps<Props>()

const isTrue = computed(() => {
  return props.value === true || props.value === 1 || props.value === '1' || props.value === 'true'
})

const colorClass = computed(() => {
  const color = isTrue.value
    ? props.column.trueColor || 'success'
    : props.column.falseColor || 'danger'

  switch (color) {
    case 'success':
      return 'text-green-500 bg-green-500/10'
    case 'danger':
      return 'text-red-500 bg-red-500/10'
    case 'warning':
      return 'text-yellow-500 bg-yellow-500/10'
    case 'primary':
      return 'text-primary bg-primary/10'
    default:
      return 'text-muted-foreground bg-muted'
  }
})
</script>

<template>
  <div
    class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
    :class="colorClass"
  >
    <Check v-if="isTrue" class="h-3 w-3" />
    <X v-else class="h-3 w-3" />
    <span>{{ isTrue ? column.trueLabel || 'Yes' : column.falseLabel || 'No' }}</span>
  </div>
</template>
