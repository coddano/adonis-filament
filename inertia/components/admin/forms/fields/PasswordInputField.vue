<script setup lang="ts">
import { ref } from 'vue'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Lock } from 'lucide-vue-next'

interface FieldData {
  type: string
  name: string
  label: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  minLength?: number
  revealable?: boolean
  autocomplete?: string
}

// Vue 3.4+ defineModel
const modelValue = defineModel<string>({ default: '' })

const props = defineProps<{
  field: FieldData
  error?: string
}>()

const showPassword = ref(false)

const toggleVisibility = () => {
  showPassword.value = !showPassword.value
}
</script>

<template>
  <div class="space-y-2">
    <Label :for="field.name" :class="{ 'text-destructive': error }">
      {{ field.label }}
      <span v-if="field.required" class="text-destructive ml-0.5">*</span>
    </Label>

    <div class="relative">
      <Lock class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

      <Input
        :id="field.name"
        :name="field.name"
        :type="showPassword ? 'text' : 'password'"
        v-model="modelValue"
        :placeholder="field.placeholder"
        :disabled="field.disabled"
        :minlength="field.minLength"
        :autocomplete="field.autocomplete || 'new-password'"
        class="pl-10 pr-10"
        :class="{ 'border-destructive focus-visible:ring-destructive': error }"
      />

      <Button
        v-if="field.revealable !== false"
        type="button"
        variant="ghost"
        size="icon"
        class="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
        @click="toggleVisibility"
        tabindex="-1"
      >
        <Eye v-if="showPassword" class="h-4 w-4 text-muted-foreground" />
        <EyeOff v-else class="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>

    <p v-if="field.helperText && !error" class="text-sm text-muted-foreground">
      {{ field.helperText }}
    </p>

    <p v-if="error" class="text-sm text-destructive">
      {{ error }}
    </p>
  </div>
</template>
