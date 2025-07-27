<script setup lang="ts">
interface Props {
  isMobileOpen?: boolean
  modelValue?: {
    search: string
    sort: string
    filters: {
      languages: string[]
      types: string[]
    }
  }
}

interface Emits {
  (e: 'update:modelValue', value: Props['modelValue']): void
  (e: 'search', query: string): void
  (e: 'sort', option: string): void
  (e: 'filter', filters: { languages: string[], types: string[] }): void
  (e: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  isMobileOpen: false,
  modelValue: () => ({
    search: '',
    sort: 'stars',
    filters: { languages: [], types: [] },
  }),
})

const emit = defineEmits<Emits>()

// Local reactive state
const searchQuery = ref(props.modelValue.search)
const sortOption = ref(props.modelValue.sort)
const filters = ref(props.modelValue.filters)

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  searchQuery.value = newValue.search
  sortOption.value = newValue.sort
  filters.value = newValue.filters
}, { deep: true })

// Handle search changes
function handleSearch(query: string): void {
  searchQuery.value = query
  emitUpdates()
  emit('search', query)
}

// Handle sort changes
function handleSortChange(option: string): void {
  sortOption.value = option
  emitUpdates()
  emit('sort', option)
}

// Handle filter changes
function handleFilterChange(newFilters: { languages: string[], types: string[] }): void {
  filters.value = newFilters
  emitUpdates()
  emit('filter', newFilters)
}

// Emit all updates for v-model
function emitUpdates(): void {
  emit('update:modelValue', {
    search: searchQuery.value,
    sort: sortOption.value,
    filters: filters.value,
  })
}
</script>

<template>
  <aside
    class="w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800"
    :class="{ 'hidden lg:block': !isMobileOpen }"
  >
    <div class="p-6 space-y-6">
      <!-- Search Section -->
      <div>
        <h3 class="text-sm font-semibold text-zinc-900 dark:text-white mb-3">
          Search
        </h3>
        <DirectorySearch
          v-model="searchQuery"
          @search="handleSearch"
        />
      </div>

      <!-- Sort Section -->
      <div>
        <h3 class="text-sm font-semibold text-zinc-900 dark:text-white mb-3">
          Sort
        </h3>
        <DirectorySort
          v-model="sortOption"
          @sort-change="handleSortChange"
        />
      </div>

      <!-- Filters Section -->
      <div>
        <h3 class="text-sm font-semibold text-zinc-900 dark:text-white mb-3">
          Filters
        </h3>
        <DirectoryFilters
          v-model="filters"
          @filter-change="handleFilterChange"
        />
      </div>
    </div>

    <!-- Mobile overlay -->
    <button
      v-if="isMobileOpen"
      class="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden cursor-pointer"
      aria-label="Close sidebar"
      @click="$emit('close')"
      @keydown.escape="$emit('close')"
    />
  </aside>
</template>
