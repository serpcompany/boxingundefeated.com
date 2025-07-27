<script setup lang="ts">
interface Props {
  modelValue?: {
    languages: string[]
    types: string[]
  }
}

interface Emits {
  (e: 'update:modelValue', value: { languages: string[], types: string[] }): void
  (e: 'filterChange', filters: { languages: string[], types: string[] }): void
}

interface FilterOption {
  value: string
  label: string
}

// Props for v-model support
const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({ languages: [], types: [] }),
})

// Emits for filter changes
const emit = defineEmits<Emits>()

// Language options
const languageOptions: FilterOption[] = [
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'rust', label: 'Rust' },
  { value: 'go', label: 'Go' },
  { value: 'java', label: 'Java' },
  { value: 'csharp', label: 'C#' },
  { value: 'php', label: 'PHP' },
]

// Type options
const typeOptions: FilterOption[] = [
  { value: 'backend', label: 'Backend' },
  { value: 'frontend', label: 'Frontend' },
  { value: 'fullstack', label: 'Full Stack' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'ai', label: 'AI/ML' },
  { value: 'devops', label: 'DevOps' },
  { value: 'testing', label: 'Testing' },
]

// Local reactive state
const selectedLanguages = ref<string[]>(props.modelValue.languages)
const selectedTypes = ref<string[]>(props.modelValue.types)

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  selectedLanguages.value = newValue.languages
  selectedTypes.value = newValue.types
})

// Handle language filter changes
function handleLanguageChange(language: string, checked: boolean): void {
  if (checked) {
    selectedLanguages.value.push(language)
  }
  else {
    const index = selectedLanguages.value.indexOf(language)
    if (index > -1) {
      selectedLanguages.value.splice(index, 1)
    }
  }
  handleFilterChange()
}

// Handle type filter changes
function handleTypeChange(type: string, checked: boolean): void {
  if (checked) {
    selectedTypes.value.push(type)
  }
  else {
    const index = selectedTypes.value.indexOf(type)
    if (index > -1) {
      selectedTypes.value.splice(index, 1)
    }
  }
  handleFilterChange()
}

// Handle filter changes
function handleFilterChange(): void {
  const filters = {
    languages: selectedLanguages.value,
    types: selectedTypes.value,
  }

  emit('update:modelValue', filters)
  emit('filterChange', filters)
}
</script>

<template>
  <div class="filters-container space-y-6">
    <!-- Language Filters -->
    <div class="filter-section language-filters">
      <h3 class="text-sm font-semibold text-zinc-900 dark:text-white mb-3">
        Filter by language
      </h3>
      <div class="space-y-2">
        <div v-for="language in languageOptions" :key="language.value" class="flex items-center">
          <UCheckbox
            :id="`lang-${language.value}`"
            :model-value="selectedLanguages.includes(language.value)"
            :label="language.label"
            @update:model-value="(checked) => handleLanguageChange(language.value, checked)"
          />
        </div>
      </div>
    </div>

    <!-- Type Filters -->
    <div class="filter-section type-filters">
      <h3 class="text-sm font-semibold text-zinc-900 dark:text-white mb-3">
        Filter by type
      </h3>
      <div class="space-y-2">
        <div v-for="type in typeOptions" :key="type.value" class="flex items-center">
          <UCheckbox
            :id="`type-${type.value}`"
            :model-value="selectedTypes.includes(type.value)"
            :label="type.label"
            @update:model-value="(checked) => handleTypeChange(type.value, checked)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
