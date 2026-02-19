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
  acceptedFileTypes?: string[]
}

const props = defineProps<{
  field: FieldData
  modelValue: any
  error?: string
}>()

const emit = defineEmits(['update:modelValue'])

const handleFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    emit('update:modelValue', input.files[0])
  } else {
    emit('update:modelValue', null)
  }
}

// Pour l'affichage, si on a une valeur string (chemin du fichier existant), on pourrait l'afficher
// But file input cannot be pre-filled.
</script>

<template>
  <div class="space-y-2">
    <Label :for="field.name" :class="{ 'text-destructive': error }">
      {{ field.label }}
      <span v-if="field.required" class="text-destructive ml-0.5">*</span>
    </Label>

    <div v-if="typeof modelValue === 'string' && modelValue" class="mb-2">
      <div class="text-xs text-muted-foreground mb-1">Fichier actuel :</div>
      <div class="flex items-center gap-2 p-2 border rounded bg-muted/30">
        <a
          :href="`/${modelValue}`"
          target="_blank"
          class="text-sm text-primary hover:underline truncate"
        >
          {{ modelValue }}
        </a>
      </div>
    </div>

    <Input
      :id="field.name"
      type="file"
      @change="handleFileChange"
      :disabled="field.disabled"
      :accept="field.acceptedFileTypes?.join(',')"
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
