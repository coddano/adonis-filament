<script setup lang="ts">
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface FieldData {
  type: string
  name: string
  label: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  rows?: number
}

// Vue 3.4+ defineModel
const modelValue = defineModel<string>({ default: '' })

const props = defineProps<{
  field: FieldData
  error?: string
}>()
</script>

<template>
  <div class="space-y-2">
    <Label :for="field.name" :class="{ 'text-destructive': error }">
      {{ field.label }}
      <span v-if="field.required" class="text-destructive ml-0.5">*</span>
    </Label>

    <Textarea
      :id="field.name"
      :name="field.name"
      v-model="modelValue"
      :placeholder="field.placeholder"
      :disabled="field.disabled"
      :rows="field.rows || 3"
      :class="{ 'border-destructive focus-visible:ring-destructive': error }"
    />

    <p v-if="field.helperText && !error" class="text-sm text-muted-foreground">
      {{ field.helperText }}
    </p>

    <p v-if="error" class="text-sm text-destructive">
      {{ error }}
    </p>
  </div>
</template>
