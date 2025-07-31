<script setup lang="ts">
interface Props {
  modelValue?: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'search', query: string): void
}

// Props for v-model support
const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
})

// Emits for v-model and search events
const emit = defineEmits<Emits>()

// Local reactive state
const searchQuery = ref(props.modelValue)

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue: string) => {
  searchQuery.value = newValue
})

// Handle search input
function handleSearch(): void {
  emit('update:modelValue', searchQuery.value)
  emit('search', searchQuery.value)
}
</script>

<template>
  <div class="search-container relative">
    <UInput
      v-model="searchQuery"
      type="text"
      placeholder="Search servers..."
      class="pl-10"
      @input="handleSearch"
    >
      <template #leading>
        <UIcon name="i-heroicons-magnifying-glass" class="w-5 h-5 text-zinc-400" />
      </template>
    </UInput>
  </div>
</template>
