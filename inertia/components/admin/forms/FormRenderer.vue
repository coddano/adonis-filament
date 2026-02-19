<script setup lang="ts">
import { reactive, ref, onMounted, markRaw, watch } from 'vue'
import { router } from '@inertiajs/vue3'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Save, X, Loader2 } from 'lucide-vue-next'

// Import field components (marked raw to avoid reactivity overhead)
import TextInputField from './fields/TextInputField.vue'
import EmailInputField from './fields/EmailInputField.vue'
import PasswordInputField from './fields/PasswordInputField.vue'
import CheckboxField from './fields/CheckboxField.vue'
import SelectField from './fields/SelectField.vue'
import TextareaField from './fields/TextareaField.vue'
import DatePickerField from './fields/DatePickerField.vue'
import FileUploadField from './fields/FileUploadField.vue'

interface FieldSchema {
  type: string
  name: string
  label: string
  columnSpan?: number
  [key: string]: any
}

interface FormSchema {
  columns: number
  fields: FieldSchema[]
}

interface Props {
  schema: FormSchema
  data?: Record<string, any>
  action: string
  method?: 'post' | 'put'
  cancelUrl: string
  title?: string
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  method: 'post',
  readonly: false,
})

// Form state - use reactive for better performance
const formData = reactive<Record<string, any>>({})
const errors = ref<Record<string, string>>({})
const processing = ref(false)

// Map field types to components (marked raw)
const componentMap: Record<string, any> = {
  'text-input': markRaw(TextInputField),
  'email-input': markRaw(EmailInputField),
  'password-input': markRaw(PasswordInputField),
  'toggle': markRaw(CheckboxField),
  'select': markRaw(SelectField),
  'textarea': markRaw(TextareaField),
  'date-picker': markRaw(DatePickerField),
  'file-upload': markRaw(FileUploadField),
}

// Initialize form data
onMounted(() => {
  // First, apply default field values
  for (const field of props.schema.fields) {
    if (field.defaultValue !== undefined && field.defaultValue !== null) {
      formData[field.name] = field.defaultValue
    } else {
      formData[field.name] = field.type === 'toggle' ? false : ''
    }
  }

  // Then, override with existing data (edit mode)
  // IMPORTANT: only assign fields defined in schema
  if (props.data) {
    for (const field of props.schema.fields) {
      if (props.data[field.name] !== undefined) {
        let value = props.data[field.name]

        // Convert numbers to booleans for toggles (SQLite stores 0/1)
        if (field.type === 'toggle') {
          value = value === true || value === 'true' || value === 1 || value === '1'
        }

        formData[field.name] = value
      }
    }
  }
})

// Compute grid classes for each field
const getFieldClasses = (field: FieldSchema) => {
  const span = field.columnSpan || 1
  if (props.schema.columns === 1) return ''
  return span === 2 ? 'md:col-span-2' : ''
}

// Field update handler
const updateFieldValue = (fieldName: string, value: any) => {
  if (props.readonly) return
  formData[fieldName] = value
  onFieldInput(fieldName)
}

// Fonction de slugification simple
const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // Split accents
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .trim()
    .replace(/\s+/g, '-') // Remplace les espaces par -
    .replace(/[^\w-]+/g, '') // Remove non-alphanumeric characters
    .replace(/--+/g, '-') // Remplace les multiples - par un seul
}

// Watch formData changes to handle dependencies (like slugFrom)
// We need to watch formData, but deep-watching the whole object can be expensive.
// Instead, target fields using 'slugFrom' and watch specific source fields.
// Non, on ne peut pas watcher dynamiquement facilement.
// On va watcher formData en deep, c'est acceptable pour un formulaire d'admin.

// Track fields manually edited by the user (to avoid overriding slug)
const dirtyFields = ref<Set<string>>(new Set())

watch(
  formData,
  (newVal) => {
    if (props.readonly) return

    for (const field of props.schema.fields) {
      if (field.slugFrom) {
        const sourceValue = newVal[field.slugFrom]
        // If slug field was not manually edited (or is empty), update it
        // Exception: in edit mode, if slug is already set, do not overwrite it on load,
        // only when the user modifies the source.

        // Approche : si la source change et que la cible n'est pas "dirty", on update.
        // Problem: how do we know whether the source just changed?
        // Compare with a previous snapshot? formData is a proxy.

        const targetName = field.name
        // On update le slug SI :
        // 1. Field has not been marked as "manually edited" (dirty)
        if (!dirtyFields.value.has(targetName)) {
          if (sourceValue) {
            formData[targetName] = slugify(sourceValue)
          }
        }
      }
    }
  },
  { deep: true }
)

// Intercepter les modifications manuelles pour marquer comme dirty
const onFieldInput = (fieldName: string) => {
  dirtyFields.value.add(fieldName)
}

// Soumission du formulaire
const submit = () => {
  if (props.readonly) return

  processing.value = true
  errors.value = {}

  // Clean data before submit - exclude system fields
  const excludedFields = ['id', 'createdAt', 'updatedAt', 'created_at', 'updated_at']
  const sanitizedData: Record<string, any> = {}

  // Send only fields defined in schema
  for (const field of props.schema.fields) {
    const value = formData[field.name]
    if (!excludedFields.includes(field.name)) {
      sanitizedData[field.name] = value
    }
  }

  const submitMethod = props.method === 'put' ? 'put' : 'post'

  router[submitMethod](props.action, sanitizedData, {
    onSuccess: () => {
      // Redirection handled by backend
    },
    onError: (err) => {
      errors.value = err as Record<string, string>
    },
    onFinish: () => {
      processing.value = false
    },
  })
}

// Annuler et retourner
const cancel = () => {
  router.visit(props.cancelUrl)
}
</script>

<template>
  <Card class="border-border shadow-sm">
    <CardHeader v-if="title" class="pb-4">
      <CardTitle class="text-xl">{{ title }}</CardTitle>
    </CardHeader>

    <CardContent :class="{ 'pt-6': !title }">
      <form @submit.prevent="submit" class="space-y-6">
        <!-- Grille de champs -->
        <div :class="['grid gap-6', schema.columns === 2 ? 'md:grid-cols-2' : 'grid-cols-1']">
          <template v-for="field in schema.fields" :key="field.name">
            <div :class="getFieldClasses(field)">
              <component
                :is="componentMap[field.type] || TextInputField"
                :modelValue="formData[field.name]"
                @update:modelValue="updateFieldValue(field.name, $event)"
                :field="{ ...field, disabled: readonly || field.disabled }"
                :error="errors[field.name]"
              />
            </div>
          </template>
        </div>

        <Separator class="my-6" />

        <!-- Actions -->
        <div class="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" @click="cancel" :disabled="processing">
            <X class="mr-2 h-4 w-4" />
            {{ readonly ? 'Back' : 'Cancel' }}
          </Button>
          <Button v-if="!readonly" type="submit" :disabled="processing">
            <Loader2 v-if="processing" class="mr-2 h-4 w-4 animate-spin" />
            <Save v-else class="mr-2 h-4 w-4" />
            {{ processing ? 'Saving...' : 'Save' }}
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>
</template>
