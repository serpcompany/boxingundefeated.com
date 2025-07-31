<script setup lang="ts">
interface Props {
  modelValue?: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'sortChange', sortBy: string): void
}

interface SortOption {
  value: string
  label: string
}

// Props for v-model support
const props = withDefaults(defineProps<Props>(), {
  modelValue: 'stars',
})

// Emits for v-model and sort change events
const emit = defineEmits<Emits>()

// Sort options available
const sortOptions: SortOption[] = [
  { value: 'stars', label: 'Most Stars' },
  { value: 'downloads', label: 'Most Downloads' },
  { value: 'newest', label: 'Newest' },
  { value: 'a-z', label: 'A-Z' },
  { value: 'z-a', label: 'Z-A' },
]

// Local reactive state
const selectedSort = ref(props.modelValue)

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue: string) => {
  selectedSort.value = newValue
})

// Handle sort change
function handleSortChange(value: string): void {
  emit('update:modelValue', value)
  emit('sortChange', value)
}
</script>

<template>
  <div class="sort-container">
    <USelect
      v-model="selectedSort"
      :options="sortOptions"
      placeholder="Sort by..."
      @update:model-value="handleSortChange"
    />
  </div>
</template>
