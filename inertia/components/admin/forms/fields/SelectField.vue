<script setup lang="ts">
import { computed } from 'vue'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Check, ChevronsUpDown, X } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ref } from 'vue'

interface SelectOption {
  value: string | number
  label: string
}

interface FieldData {
  type: string
  name: string
  label: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  options: SelectOption[]
  searchable?: boolean
  multiple?: boolean
}

// Model can be scalar (string/number) or array for multiple
const modelValue = defineModel<string | number | (string | number)[] | null>()

const props = defineProps<{
  field: FieldData
  error?: string
}>()

const open = ref(false)

// Management Multiple
const selectedValues = computed({
  get: () => {
    if (Array.isArray(modelValue.value)) return modelValue.value
    if (modelValue.value) return [modelValue.value]
    return []
  },
  set: (val) => {
    modelValue.value = val
  },
})

// Management Single
const selectedValue = computed({
  get: () => modelValue.value,
  set: (val) => {
    modelValue.value = val
  },
})

const getLabel = (value: string | number) => {
  const opt = props.field.options.find((o) => String(o.value) === String(value))
  return opt ? opt.label : value
}

const toggleSelection = (value: string | number) => {
  // Conversion en string pour comparaison uniforme
  const strValue = String(value)
  const current = selectedValues.value.map(String)

  // If already selected, remove it
  if (current.includes(strValue)) {
    // Filtrer en gardant les types originaux si possible, mais ici on a perdu le type original dans le map.
    // Re-run filter on original values
    const newValues = (selectedValues.value as any[]).filter((v) => String(v) !== strValue)
    selectedValues.value = newValues
  } else {
    // Ajout (attention au type, on essaie de retrouver le type de l'option)
    const opt = props.field.options.find((o) => String(o.value) === strValue)
    const valToAdd = opt ? opt.value : value
    selectedValues.value = [...(selectedValues.value as any[]), valToAdd]
  }
}

const handleSelect = (value: string | number) => {
  if (props.field.multiple) {
    toggleSelection(value)
    // On garde ouvert en multiple
  } else {
    selectedValue.value = value
    open.value = false
  }
}

const isSelected = (value: string | number) => {
  const strValue = String(value)
  if (props.field.multiple) {
    return selectedValues.value.map(String).includes(strValue)
  }
  return String(selectedValue.value) === strValue
}

const removeValue = (value: string | number) => {
  toggleSelection(value)
}
</script>

<template>
  <div class="space-y-2">
    <Label :class="{ 'text-destructive': error }">
      {{ field.label }}
      <span v-if="field.required" class="text-destructive ml-0.5">*</span>
    </Label>

    <Popover v-model:open="open">
      <PopoverTrigger as-child>
        <Button
          variant="outline"
          role="combobox"
          :aria-expanded="open"
          class="w-full justify-between h-auto min-h-10 px-3 py-2"
          :class="{ 'border-destructive focus:ring-destructive': error }"
          :disabled="field.disabled"
        >
          <div class="flex flex-wrap gap-1 items-center text-left font-normal">
            <!-- Affichage Multiple -->
            <template v-if="field.multiple && selectedValues.length > 0">
              <Badge
                v-for="val in selectedValues"
                :key="String(val)"
                variant="secondary"
                class="mr-1 mb-1"
              >
                {{ getLabel(val as string | number) }}
                <span
                  class="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                  @click.stop="removeValue(val as string | number)"
                >
                  <X class="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </span>
              </Badge>
            </template>

            <!-- Affichage Single -->
            <template v-else-if="!field.multiple && selectedValue">
              {{ getLabel(selectedValue as string | number) }}
            </template>

            <!-- Placeholder -->
            <span v-else class="text-muted-foreground">
              {{ field.placeholder || 'Select...' }}
            </span>
          </div>
          <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput :placeholder="field.searchable ? 'Search...' : undefined" class="h-9" />
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              <CommandItem
                v-for="option in field.options"
                :key="option.value"
                :value="option.label"
                @select="() => handleSelect(option.value)"
              >
                <Check
                  :class="
                    cn('mr-2 h-4 w-4', isSelected(option.value) ? 'opacity-100' : 'opacity-0')
                  "
                />
                {{ option.label }}
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>

    <p v-if="field.helperText && !error" class="text-sm text-muted-foreground">
      {{ field.helperText }}
    </p>
    <p v-if="error" class="text-sm text-destructive">
      {{ error }}
    </p>
  </div>
</template>
