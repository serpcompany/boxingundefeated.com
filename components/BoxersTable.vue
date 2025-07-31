<script setup lang="ts">
import { useScroll } from '@vueuse/core'
import type { Boxer } from '~/types/Boxing'

interface Props {
  boxers: Boxer[]
  showDivision?: boolean
  pageSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  showDivision: false,
  pageSize: 25
})

// Filter state
const searchQuery = ref('')
const statusFilter = ref('')
const nationalityFilter = ref('')
const divisionFilter = ref<string[]>([])
const page = ref(1)

// Table columns
const columns = computed(() => {
  const cols = [
    {
      key: 'name',
      label: 'Fighter',
      sortable: true
    },
    {
      key: 'division',
      label: 'Weight Class',
      sortable: true
    },
    {
      key: 'record',
      label: 'Record'
    },
    {
      key: 'nationality',
      label: 'Nationality',
      sortable: true
    },
    {
      key: 'status',
      label: 'Status'
    }
  ]
  
  return cols
})

// Format boxer data for table
const tableData = computed(() => {
  return props.boxers.map(boxer => ({
    id: boxer.id,
    slug: boxer.slug,
    name: boxer.name,
    record: `${boxer.record.wins}-${boxer.record.losses}-${boxer.record.draws}`,
    knockouts: boxer.record.knockouts,
    nationality: boxer.nationality || '—',
    division: boxer.division || '—',
    status: boxer.active ? 'Active' : 'Retired',
    active: boxer.active,
    image: boxer.image
  }))
})

// Filter options for dropdowns
const statusOptions = [
  { label: 'All Status', value: '' },
  { label: 'Active', value: 'Active' },
  { label: 'Retired', value: 'Retired' }
]

const nationalityOptions = computed(() => {
  const nationalities = [...new Set(props.boxers.map(b => b.nationality).filter(Boolean))]
  return [
    { label: 'All Nationalities', value: '' },
    ...nationalities.map(n => ({ label: n, value: n }))
  ]
})

const divisionOptions = computed(() => {
  const divisions = [...new Set(props.boxers.map(b => b.division).filter(Boolean))]
  return divisions.sort().map(d => ({ 
    label: d.charAt(0).toUpperCase() + d.slice(1).replace(/-/g, ' '), 
    value: d 
  }))
})

// Apply filters to data
const filteredData = computed(() => {
  let filtered = tableData.value
  
  // Search filter
  if (searchQuery.value) {
    const search = searchQuery.value.toLowerCase()
    filtered = filtered.filter(boxer => 
      boxer.name.toLowerCase().includes(search) ||
      boxer.nationality.toLowerCase().includes(search) ||
      boxer.division.toLowerCase().includes(search)
    )
  }
  
  if (statusFilter.value) {
    filtered = filtered.filter(boxer => boxer.status === statusFilter.value)
  }
  
  if (nationalityFilter.value) {
    filtered = filtered.filter(boxer => boxer.nationality === nationalityFilter.value)
  }
  
  if (divisionFilter.value.length > 0) {
    filtered = filtered.filter(boxer => divisionFilter.value.includes(boxer.division))
  }
  
  return filtered
})

// Infinite scroll setup
const loadedCount = ref(props.pageSize)
const isLoading = ref(false)

// Reset loaded count when filters change
watch([searchQuery, statusFilter, nationalityFilter, divisionFilter], () => {
  loadedCount.value = props.pageSize
})

// Data to display (with infinite scroll)
const displayedData = computed(() => {
  return filteredData.value.slice(0, loadedCount.value)
})

// Load more function
const loadMore = () => {
  if (isLoading.value || loadedCount.value >= filteredData.value.length) return
  
  isLoading.value = true
  // Simulate loading delay
  setTimeout(() => {
    loadedCount.value = Math.min(loadedCount.value + props.pageSize, filteredData.value.length)
    isLoading.value = false
  }, 300)
}

// Infinite scroll composable
const tableRef = ref<HTMLElement>()
const { arrivedState } = useScroll(tableRef)

watch(() => arrivedState.bottom, (arrived) => {
  if (arrived && !isLoading.value) {
    loadMore()
  }
})

// Row click handler
function onRowClick(row: any) {
  navigateTo(`/boxers/${row.slug}`)
}

// Weight class color mapping - gradient from green (light) to red (heavy)
function getDivisionColor(division: string): string {
  // Normalize division name to lowercase with hyphens
  const normalized = division.toLowerCase().replace(/\s+/g, '-')
  
  const colorMap: Record<string, string> = {
    // Heaviest - Red spectrum
    'heavyweight': 'red',
    'cruiserweight': 'red',
    'light-heavyweight': 'orange',
    'super-middleweight': 'orange',
    'middleweight': 'amber',
    'light-middleweight': 'amber',
    'super-welterweight': 'yellow',
    'welterweight': 'yellow',
    // Middle - Yellow/Green spectrum  
    'super-lightweight': 'lime',
    'lightweight': 'lime',
    'super-featherweight': 'green',
    'featherweight': 'green',
    // Lightest - Green spectrum
    'super-bantamweight': 'emerald',
    'bantamweight': 'emerald',
    'super-flyweight': 'green',
    'flyweight': 'green',
    'light-flyweight': 'green',
    'minimumweight': 'green'
  }
  
  return colorMap[normalized] || 'gray'
}
</script>

<template>
  <div class="space-y-4">
    <!-- Filters -->
    <div class="flex items-center gap-3 mb-6">
      <!-- Search Bar -->
      <div class="relative flex-1 max-w-md">
        <UInput
          v-model="searchQuery"
          placeholder="Search fighters..."
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
                outline: 'shadow-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400'
              }
            }
          }"
        />
        
        <!-- Clear Search Button -->
        <button
          v-if="searchQuery"
          type="button"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          @click="searchQuery = ''"
        >
          <UIcon name="i-heroicons-x-mark-20-solid" class="w-5 h-5" />
        </button>
      </div>

      <USelectMenu
        v-model="statusFilter"
        :options="statusOptions"
        option-attribute="label"
        value-attribute="value"
        placeholder="Status"
        size="lg"
        class="w-40"
      />
      
      <USelectMenu
        v-model="nationalityFilter"
        :options="nationalityOptions"
        option-attribute="label"
        value-attribute="value"
        placeholder="Nationality"
        size="lg"
        class="w-48"
      />
      
      <USelectMenu
        v-model="divisionFilter"
        :options="divisionOptions"
        option-attribute="label"
        value-attribute="value"
        placeholder="Filter by division"
        multiple
        size="lg"
        class="w-64"
      >
        <template #label>
          <span v-if="divisionFilter.length === 0">All divisions</span>
          <span v-else>{{ divisionFilter.length }} {{ divisionFilter.length === 1 ? 'division' : 'divisions' }}</span>
        </template>
      </USelectMenu>
      
      <!-- Results count -->
      <div class="flex items-center text-sm text-gray-500 dark:text-gray-400 ml-auto whitespace-nowrap">
        Showing {{ displayedData.length }} of {{ filteredData.length }} fighters
      </div>
    </div>

    <!-- Table wrapper for infinite scroll with border -->
    <div class="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
      <div ref="tableRef" class="max-h-[800px] overflow-y-auto">
        <UTable 
          :rows="displayedData" 
          :columns="columns"
          :loading="false"
          class="cursor-pointer"
          :ui="{
            wrapper: 'relative',
            base: 'min-w-full table-fixed',
            thead: 'sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700',
            th: { 
              base: 'px-4 py-3.5 text-left text-sm font-semibold text-zinc-900 dark:text-white'
            },
            tbody: 'bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-700',
            tr: { 
              base: 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors duration-150',
              selected: 'bg-primary-50 dark:bg-primary-950'
            },
            td: { 
              base: 'px-4 py-3 whitespace-nowrap text-sm text-zinc-900 dark:text-zinc-100'
            }
          }"
      @select="onRowClick"
    >
      <template #name-data="{ row }">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full overflow-hidden bg-zinc-200 flex-shrink-0">
            <img 
              v-if="row.image" 
              :src="row.image" 
              :alt="row.name"
              class="w-full h-full object-cover"
            >
            <div v-else class="w-full h-full bg-zinc-300"></div>
          </div>
          <div>
            <NuxtLink 
              :to="`/boxers/${row.slug}`"
              class="text-zinc-900 dark:text-white hover:text-red-600 dark:hover:text-red-400"
            >
              {{ row.name }}
            </NuxtLink>
          </div>
        </div>
      </template>

      <template #division-data="{ row }">
        <NuxtLink 
          :to="`/divisions/${row.division.toLowerCase().replace(/\s+/g, '-')}`"
          class="inline-block"
        >
          <UBadge 
            :color="getDivisionColor(row.division)"
            variant="soft"
            size="sm"
            class="hover:opacity-80 transition-opacity font-medium"
          >
            {{ row.division }}
          </UBadge>
        </NuxtLink>
      </template>

      <template #record-data="{ row }">
        <div>
          <div class="text-zinc-900 dark:text-white">
            {{ row.record }}
          </div>
          <div v-if="row.knockouts > 0" class="text-sm text-zinc-500">
            {{ row.knockouts }} KOs
          </div>
        </div>
      </template>

      <template #status-data="{ row }">
        <UBadge 
          :color="row.active ? 'green' : 'gray'"
          :variant="row.active ? 'soft' : 'subtle'"
          size="sm"
        >
          {{ row.status }}
        </UBadge>
      </template>
        </UTable>
      </div>
    </div>

    <!-- Loading indicator -->
    <div v-if="isLoading" class="flex justify-center py-4">
      <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-zinc-500" />
    </div>

    <!-- End of list message -->
    <div v-if="!isLoading && displayedData.length === filteredData.length && filteredData.length > 0" class="text-center py-4 text-sm text-zinc-500">
      End of list - {{ filteredData.length }} fighters shown
    </div>
  </div>
</template>