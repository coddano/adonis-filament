<script setup lang="ts">
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Mail } from 'lucide-vue-next'

interface FieldData {
  type: string
  name: string
  label: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  autocomplete?: string
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

    <div class="relative">
      <Mail class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

      <Input
        :id="field.name"
        :name="field.name"
        type="email"
        v-model="modelValue"
        :placeholder="field.placeholder"
        :disabled="field.disabled"
        :autocomplete="field.autocomplete || 'email'"
        class="pl-10"
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
