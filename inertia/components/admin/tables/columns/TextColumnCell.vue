<script setup lang="ts">
import { computed, ref } from 'vue'
import { Copy, Check } from 'lucide-vue-next'

interface Props {
  value: any
  column: {
    limit?: number
    copyable?: boolean
    prefix?: string
    suffix?: string
    placeholder?: string
    wrap?: boolean
  }
}

const props = defineProps<Props>()

const copied = ref(false)

const displayValue = computed(() => {
  if (props.value === null || props.value === undefined || props.value === '') {
    return props.column.placeholder || '-'
  }

  let text = String(props.value)

  if (props.column.limit && text.length > props.column.limit) {
    text = text.substring(0, props.column.limit) + '...'
  }

  if (props.column.prefix) {
    text = props.column.prefix + text
  }

  if (props.column.suffix) {
    text = text + props.column.suffix
  }

  return text
})

async function copyToClipboard() {
  if (!props.column.copyable || !props.value) return

  try {
    await navigator.clipboard.writeText(String(props.value))
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}
</script>

<template>
  <div class="flex items-center gap-2" :class="{ 'whitespace-nowrap': !column.wrap }">
    <span
      :class="{ 'text-muted-foreground': value === null || value === undefined || value === '' }"
    >
      {{ displayValue }}
    </span>

    <button
      v-if="column.copyable && value"
      type="button"
      class="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
      @click="copyToClipboard"
      :title="copied ? 'Copied!' : 'Copy'"
    >
      <Check v-if="copied" class="h-3 w-3 text-green-500" />
      <Copy v-else class="h-3 w-3 text-muted-foreground" />
    </button>
  </div>
</template>
