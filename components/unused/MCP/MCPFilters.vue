<script setup lang="ts">
import type { MCPCategory, MCPFilters, MCPSortOption } from '~/types/Mcp'

/**
 * MCPFilters Component.
 *
 * Provides filtering and search functionality for MCP tools collection.
 * Includes category filters, compatibility filters, search, and sorting
 * options following the openalternative.co design pattern.
 *
 * @component
 * @example
 * ```vue
 * <MCPFilters
 *   :filters="currentFilters"
 *   :available-categories="categories"
 *   :available-compatibility="compatibility"
 *   @update-filters="handleFiltersUpdate"
 * />
 * ```
 */

interface Props {
  /** Current filter state. */
  filters: MCPFilters
  /** Available categories for filtering. */
  availableCategories: MCPCategory[]
  /** Available compatibility options. */
  availableCompatibility: string[]
  /** All items to calculate counts (optional). */
  allItems?: any[]
}

interface Emits {
  /** Emitted when filters change. */
  (e: 'updateFilters', filters: MCPFilters): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Reactive filter state
const searchQuery = ref(props.filters.search)
const selectedCategories = ref<MCPCategory[]>([...props.filters.categories])
const selectedCompatibility = ref<string[]>([...props.filters.compatibility])
const selectedSort = ref<MCPSortOption>(props.filters.sortBy)
const showFiltersDropdown = ref(false)

// Search states for filter columns
const categorySearch = ref('')
const compatibilitySearch = ref('')
const alternativeSearch = ref('')
const licenseSearch = ref('')

// Sort options for dropdown
const sortOptions = [
  { label: 'Name (A-Z)', value: 'name' },
  { label: 'Most Views', value: 'views' },
  { label: 'Most Copies', value: 'copies' },
  { label: 'Most Likes', value: 'likes' },
  { label: 'Recently Updated', value: 'updated' },
  { label: 'Recently Created', value: 'created' },
]

// Watch for external filter changes
watch(() => props.filters, (newFilters) => {
  searchQuery.value = newFilters.search
  selectedCategories.value = [...newFilters.categories]
  selectedCompatibility.value = [...newFilters.compatibility]
  selectedSort.value = newFilters.sortBy
}, { deep: true })

// Computed properties
const hasActiveFilters = computed(() => {
  return searchQuery.value.length > 0
    || selectedCategories.value.length > 0
    || selectedCompatibility.value.length > 0
})

const activeFiltersCount = computed(() => {
  return selectedCategories.value.length + selectedCompatibility.value.length
})

// Filtered categories based on search
const filteredCategories = computed(() => {
  if (!categorySearch.value) return props.availableCategories
  return props.availableCategories.filter(cat => 
    cat.toLowerCase().includes(categorySearch.value.toLowerCase())
  )
})

// Filtered compatibility based on search
const filteredCompatibility = computed(() => {
  if (!compatibilitySearch.value) return props.availableCompatibility
  return props.availableCompatibility.filter(compat => 
    formatCompatibilityLabel(compat).toLowerCase().includes(compatibilitySearch.value.toLowerCase())
  )
})

// Filtered alternatives for display
const filteredAlternatives = computed(() => {
  const alternatives = ['AI Tools', 'Development', 'Productivity', 'Data Science', 'DevOps', 'Security']
  if (!alternativeSearch.value) return alternatives
  return alternatives.filter(alt => 
    alt.toLowerCase().includes(alternativeSearch.value.toLowerCase())
  )
})

// Filtered licenses for display
const filteredLicenses = computed(() => {
  const licenses = ['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'AGPL-3.0', 'ISC', 'CC0-1.0']
  if (!licenseSearch.value) return licenses
  return licenses.filter(license => 
    license.toLowerCase().includes(licenseSearch.value.toLowerCase())
  )
})

// Event handlers
function handleSearchChange() {
  emitFilterUpdate()
}

function handleSortChange() {
  emitFilterUpdate()
}

function handleClearFilters() {
  searchQuery.value = ''
  selectedCategories.value = []
  selectedCompatibility.value = []
  selectedSort.value = 'name'
  categorySearch.value = ''
  compatibilitySearch.value = ''
  alternativeSearch.value = ''
  licenseSearch.value = ''
  emitFilterUpdate()
}

function clearSearch() {
  searchQuery.value = ''
  emitFilterUpdate()
}

function toggleFiltersDropdown() {
  showFiltersDropdown.value = !showFiltersDropdown.value
}

function closeFiltersDropdown() {
  showFiltersDropdown.value = false
}

function toggleCategory(category: MCPCategory) {
  const index = selectedCategories.value.indexOf(category)
  if (index > -1) {
    selectedCategories.value.splice(index, 1)
  }
  else {
    selectedCategories.value.push(category)
  }
  emitFilterUpdate()
}

function toggleCompatibility(compat: string) {
  const index = selectedCompatibility.value.indexOf(compat)
  if (index > -1) {
    selectedCompatibility.value.splice(index, 1)
  }
  else {
    selectedCompatibility.value.push(compat)
  }
  emitFilterUpdate()
}

function emitFilterUpdate() {
  const updatedFilters: MCPFilters = {
    search: searchQuery.value,
    categories: [...selectedCategories.value],
    compatibility: [...selectedCompatibility.value],
    sortBy: selectedSort.value,
  }
  emit('updateFilters', updatedFilters)
}

/**
 * Format compatibility labels for display.
 * @param compat - The compatibility string to format.
 * @returns The formatted compatibility label.
 */
function formatCompatibilityLabel(compat: string): string {
  const labels: Record<string, string> = {
    'claude-desktop': 'Claude Desktop',
    'cline': 'Cline',
    'mcpx': 'MCPX',
  }
  return labels[compat] || compat
}

// Get item count for categories
function getCategoryCount(category: MCPCategory): number {
  if (!props.allItems) return 0
  return props.allItems.filter(item => item.category === category).length
}

// Get item count for compatibility
function getCompatibilityCount(compat: string): number {
  if (!props.allItems) return 0
  return props.allItems.filter(item => 
    item.compatibility && item.compatibility.includes(compat)
  ).length
}
</script>

<template>
  <div class="w-full">
    <!-- Search Bar and Controls Row -->
    <div class="flex items-center gap-3">
      <!-- Search Bar -->
      <div class="relative flex-1">
        <UInput
          v-model="searchQuery"
          placeholder="Search tools..."
          icon="i-heroicons-magnifying-glass"
          size="lg"
          class="w-full"
          :ui="{
            wrapper: 'relative',
            base: 'relative block w-full disabled:cursor-not-allowed disabled:opacity-75 focus:outline-none border-0',
            padding: {
              lg: 'ps-11 pe-10 py-2.5'
            },
            rounded: 'rounded-lg',
            color: {
              white: {
                outline: 'shadow-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400'
              }
            }
          }"
          @input="handleSearchChange"
        />

        <!-- Clear Search Button -->
        <button
          v-if="searchQuery"
          type="button"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          @click="clearSearch"
        >
          <UIcon name="i-heroicons-x-mark-20-solid" class="w-5 h-5" />
        </button>
      </div>

      <!-- Filters Button -->
      <UButton
        variant="outline"
        color="gray"
        size="lg"
        class="flex-shrink-0 gap-1.5"
        @click="toggleFiltersDropdown"
      >
        <UIcon name="i-heroicons-adjustments-horizontal" class="w-5 h-5" />
        <span>Filters</span>
        <UBadge
          v-if="activeFiltersCount > 0"
          :label="String(activeFiltersCount)"
          color="primary"
          variant="solid"
          size="xs"
        />
      </UButton>

      <!-- Sort Dropdown -->
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Order by</span>
        <USelectMenu
          v-model="selectedSort"
          :options="sortOptions"
          value-attribute="value"
          option-attribute="label"
          size="lg"
          class="w-40"
          @change="handleSortChange"
        />
      </div>
    </div>

    <!-- Filters Dropdown -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-[500px]"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 max-h-[500px]"
      leave-to-class="opacity-0 max-h-0"
    >
      <div v-if="showFiltersDropdown" class="mt-4 overflow-hidden">
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm ring-1 ring-gray-200 dark:ring-gray-700">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
            <!-- Search alternative -->
            <div class="bg-white dark:bg-gray-900 p-4">
              <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Search alternative
              </h3>
              <UInput
                v-model="alternativeSearch"
                placeholder="Search alternative"
                size="sm"
                class="mb-3"
                :ui="{
                  color: {
                    white: {
                      outline: 'shadow-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-600'
                    }
                  }
                }"
              />
              <div class="space-y-1 max-h-48 overflow-y-auto pr-2 -mr-2">
                <label
                  v-for="(item, idx) in filteredAlternatives"
                  :key="item"
                  class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 px-2 py-1.5 rounded text-sm"
                >
                  <UCheckbox
                    :ui="{
                      base: 'h-4 w-4 dark:checked:bg-primary-400 dark:checked:border-primary-400 dark:indeterminate:bg-primary-400 dark:indeterminate:border-primary-400 disabled:opacity-50 disabled:cursor-not-allowed'
                    }"
                  />
                  <span class="flex-1 text-gray-700 dark:text-gray-300 truncate">{{ item }}</span>
                  <span class="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{{ 10 + idx * 5 }}</span>
                </label>
              </div>
            </div>

            <!-- Categories -->
            <div class="bg-white dark:bg-gray-900 p-4">
              <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Search category
              </h3>
              <UInput
                v-model="categorySearch"
                placeholder="Search category"
                size="sm"
                class="mb-3"
                :ui="{
                  color: {
                    white: {
                      outline: 'shadow-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-600'
                    }
                  }
                }"
              />
              <div class="space-y-1 max-h-48 overflow-y-auto pr-2 -mr-2">
                <label
                  v-for="category in filteredCategories"
                  :key="category"
                  class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 px-2 py-1.5 rounded text-sm"
                >
                  <UCheckbox
                    :model-value="selectedCategories.includes(category)"
                    :ui="{
                      base: 'h-4 w-4 dark:checked:bg-primary-400 dark:checked:border-primary-400 dark:indeterminate:bg-primary-400 dark:indeterminate:border-primary-400 disabled:opacity-50 disabled:cursor-not-allowed'
                    }"
                    @change="toggleCategory(category)"
                  />
                  <span class="flex-1 text-gray-700 dark:text-gray-300 truncate">{{ category }}</span>
                  <span class="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{{ getCategoryCount(category) }}</span>
                </label>
              </div>
            </div>

            <!-- Stack/Compatibility -->
            <div class="bg-white dark:bg-gray-900 p-4">
              <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Search stack
              </h3>
              <UInput
                v-model="compatibilitySearch"
                placeholder="Search stack"
                size="sm"
                class="mb-3"
                :ui="{
                  color: {
                    white: {
                      outline: 'shadow-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-600'
                    }
                  }
                }"
              />
              <div class="space-y-1 max-h-48 overflow-y-auto pr-2 -mr-2">
                <label
                  v-for="compat in filteredCompatibility"
                  :key="compat"
                  class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 px-2 py-1.5 rounded text-sm"
                >
                  <UCheckbox
                    :model-value="selectedCompatibility.includes(compat)"
                    :ui="{
                      base: 'h-4 w-4 dark:checked:bg-primary-400 dark:checked:border-primary-400 dark:indeterminate:bg-primary-400 dark:indeterminate:border-primary-400 disabled:opacity-50 disabled:cursor-not-allowed'
                    }"
                    @change="toggleCompatibility(compat)"
                  />
                  <span class="flex-1 text-gray-700 dark:text-gray-300 truncate">{{ formatCompatibilityLabel(compat) }}</span>
                  <span class="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{{ getCompatibilityCount(compat) }}</span>
                </label>
              </div>
            </div>

            <!-- License -->
            <div class="bg-white dark:bg-gray-900 p-4">
              <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Search license
              </h3>
              <UInput
                v-model="licenseSearch"
                placeholder="Search license"
                size="sm"
                class="mb-3"
                :ui="{
                  color: {
                    white: {
                      outline: 'shadow-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-600'
                    }
                  }
                }"
              />
              <div class="space-y-1 max-h-48 overflow-y-auto pr-2 -mr-2">
                <label
                  v-for="license in filteredLicenses"
                  :key="license"
                  class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 px-2 py-1.5 rounded text-sm"
                >
                  <UCheckbox
                    :ui="{
                      base: 'h-4 w-4 dark:checked:bg-primary-400 dark:checked:border-primary-400 dark:indeterminate:bg-primary-400 dark:indeterminate:border-primary-400 disabled:opacity-50 disabled:cursor-not-allowed'
                    }"
                  />
                  <span class="flex-1 text-gray-700 dark:text-gray-300 truncate">{{ license }}</span>
                  <span class="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{{ Math.floor(Math.random() * 50) + 10 }}</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Clear Filters -->
          <div v-if="hasActiveFilters" class="p-4 border-t border-gray-200 dark:border-gray-700">
            <UButton
              variant="ghost"
              color="gray"
              size="sm"
              class="w-full justify-center"
              @click="handleClearFilters"
            >
              <UIcon name="i-heroicons-x-mark" class="mr-2" />
              Clear all filters
            </UButton>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>