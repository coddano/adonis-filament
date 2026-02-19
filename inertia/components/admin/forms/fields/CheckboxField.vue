<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

interface FieldData {
  type: string
  name: string
  label: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const props = defineProps<{
  field: FieldData
  error?: string
  modelValue?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

// Local state de la checkbox
const localChecked = ref(false)

// Initialiser avec la valeur du parent
onMounted(() => {
  localChecked.value = Boolean(props.modelValue)
})

// Synchroniser quand le parent change
watch(
  () => props.modelValue,
  (newVal) => {
    localChecked.value = Boolean(newVal)
  }
)

// Handler pour le changement
const toggle = () => {
  localChecked.value = !localChecked.value
  emit('update:modelValue', localChecked.value)
}
</script>

<template>
  <div class="space-y-3">
    <div
      class="flex items-start space-x-3 rounded-lg border border-input p-4 cursor-pointer hover:bg-accent/50 transition-colors"
      :class="{ 'border-destructive': error, 'opacity-50': field.disabled }"
      @click="!field.disabled && toggle()"
    >
      <div
        class="mt-1 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors"
        :class="localChecked ? 'bg-primary border-primary' : 'border-muted-foreground'"
      >
        <svg
          v-if="localChecked"
          class="h-3 w-3 text-primary-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="3"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div class="space-y-1 leading-none flex-1">
        <span class="text-base font-medium" :class="{ 'text-destructive': error }">
          {{ field.label }}
          <span v-if="field.required" class="text-destructive ml-0.5">*</span>
        </span>
        <p v-if="field.helperText" class="text-sm text-muted-foreground">
          {{ field.helperText }}
        </p>
      </div>
    </div>

    <p v-if="error" class="text-sm text-destructive">
      {{ error }}
    </p>
  </div>
</template>
