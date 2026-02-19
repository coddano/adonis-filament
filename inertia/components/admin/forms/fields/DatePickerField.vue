<script setup lang="ts">
import { computed } from 'vue'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input' // Reuse shadcn Input style

interface FieldData {
  type: string
  name: string
  label: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  minDate?: string
  maxDate?: string
}

// Vue 3.4+ defineModel
const modelValue = defineModel<string | null>()

const props = defineProps<{
  field: FieldData
  error?: string
}>()

// Computed pour s'assurer que la valeur est au bon format pour l'input date (YYYY-MM-DD)
// If full ISO date (2024-01-01T...), keep date part only
const inputValue = computed({
  get: () => {
    if (!modelValue.value) return ''
    return modelValue.value.split('T')[0]
  },
  set: (val) => {
    modelValue.value = val ? val : null
  },
})
</script>

<template>
  <div class="space-y-2">
    <Label :for="field.name" :class="{ 'text-destructive': error }">
      {{ field.label }}
      <span v-if="field.required" class="text-destructive ml-0.5">*</span>
    </Label>

    <div class="relative">
      <Input
        :id="field.name"
        type="date"
        v-model="inputValue"
        :placeholder="field.placeholder"
        :disabled="field.disabled"
        :min="field.minDate"
        :max="field.maxDate"
        :class="{ 'border-destructive focus-visible:ring-destructive': error }"
      />
    </div>

    <p v-if="field.helperText && !error" class="text-sm text-muted-foreground">
      {{ field.helperText }}
    </p>

    <p v-if="error" class="text-sm text-destructive">
      {{ error }}
    </p>
  </div>
</template>
