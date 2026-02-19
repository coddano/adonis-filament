<script setup lang="ts">
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface FieldData {
  type: string
  name: string
  label: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  maxLength?: number
  minLength?: number
  prefix?: string
  suffix?: string
  autocomplete?: string
}

// Vue 3.4+ defineModel pour une meilleure performance
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
      <!-- Prefix -->
      <span
        v-if="field.prefix"
        class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"
      >
        {{ field.prefix }}
      </span>

      <Input
        :id="field.name"
        :name="field.name"
        type="text"
        v-model="modelValue"
        :placeholder="field.placeholder"
        :disabled="field.disabled"
        :maxlength="field.maxLength"
        :minlength="field.minLength"
        :autocomplete="field.autocomplete"
        :class="[
          { 'border-destructive focus-visible:ring-destructive': error },
          { 'pl-8': field.prefix },
          { 'pr-8': field.suffix },
        ]"
      />

      <!-- Suffix -->
      <span
        v-if="field.suffix"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"
      >
        {{ field.suffix }}
      </span>
    </div>

    <p v-if="field.helperText && !error" class="text-sm text-muted-foreground">
      {{ field.helperText }}
    </p>

    <p v-if="error" class="text-sm text-destructive">
      {{ error }}
    </p>
  </div>
</template>
