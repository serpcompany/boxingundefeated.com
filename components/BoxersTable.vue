<script setup lang="ts">
import { useScroll } from '@vueuse/core'
import type { Boxer } from '~/types'

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
    }
  ]

  // Only show division column if showDivision is true
  if (props.showDivision) {
    cols.push({
      key: 'division',
      label: 'Weight Class',
      sortable: true
    })
  }

  cols.push(
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
  )

  return cols
})

// Format boxer data for table
const tableData = computed(() => {
  return props.boxers.map(boxer => ({
    id: boxer.id,
    slug: boxer.slug,
    name: boxer.name,
    record: `${boxer.proWins}-${boxer.proLosses}-${boxer.proDraws}`,
    knockouts: boxer.proWinsByKnockout,
    nationality: boxer.nationality || '—',
    division: boxer.proDivision || '—',
    status: boxer.proStatus === 'active' ? 'Active' : 'Retired',
    active: boxer.proStatus === 'active',
    image: boxer.avatarImage
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
  const divisions = [...new Set(props.boxers.map(b => b.proDivision).filter(Boolean))]
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
</script>

<template>
  <div class="space-y-4 my-8">
    <!-- Filters -->
    <div class="flex items-center gap-3 mb-6">
      <!-- Search Bar -->
      <div class="relative flex-1 max-w-md">
        <UInput
          v-model="searchQuery"
          placeholder="Search..."
          icon="i-heroicons-magnifying-glass"
          size="lg"
          class="w-full"
          color="neutral"
          variant="outline"
          :ui="{
            root: 'relative ps-11 pe-10 py-2.5 rounded-lg',
            base: 'relative block w-full disabled:cursor-not-allowed disabled:opacity-75 focus:outline-none border-0',
          }"
        />

        <!-- Clear Search Button -->
        <button
          v-if="searchQuery"
          type="button"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
          @click="searchQuery = ''"
        >
          <UIcon name="i-heroicons-x-mark-20-solid" class="w-5 h-5" />
        </button>
      </div>

      <USelectMenu
        v-model="statusFilter"
        :items="statusOptions"
        label-key="label"
        value-key="value"
        placeholder="Status"
        size="lg"
        class="w-40"
      />

      <USelectMenu
        v-model="nationalityFilter"
        :items="nationalityOptions"
        placeholder="Nationality"
        searchable
        searchable-placeholder="Type to search..."
        size="lg"
        class="w-48"
      />

      <USelectMenu
        v-model="divisionFilter"
        :items="divisionOptions"
        label-key="label"
        value-key="value"
        placeholder="Filter by division"
        multiple
        size="lg"
        class="w-48"
      >
        <template #label>
          <span v-if="divisionFilter.length === 0">Divisions</span>
          <span v-else>{{ divisionFilter.length }} {{ divisionFilter.length === 1 ? 'division' : 'divisions' }}</span>
        </template>
      </USelectMenu>

      <!-- Results count -->
      <div class="flex items-center text-sm text-neutral-500 ml-auto whitespace-nowrap">
        {{ displayedData.length }} of {{ filteredData.length }} fighters
      </div>
    </div>

    <!-- Table wrapper for infinite scroll with border -->
    <div class="border border-zinc-200 rounded-lg overflow-hidden">
      <div ref="tableRef" class="max-h-[800px] overflow-y-auto">
        <UTable
          :rows="displayedData"
          :columns="columns"
          :loading="false"
          class="cursor-pointer"
          :ui="{
            wrapper: 'relative',
            base: 'min-w-full table-fixed',
            thead: 'sticky top-0 z-10 bg-zinc-50 border-b border-zinc-200',
            th: {
              base: 'px-4 py-3.5 text-left text-sm font-semibold text-zinc-900'
            },
            tbody: 'bg-white divide-y divide-zinc-200',
            tr: {
              base: 'hover:bg-zinc-50 transition-colors duration-150',
              selected: 'bg-primary-50'
            },
            td: {
              base: 'px-4 py-3 whitespace-nowrap text-sm text-zinc-900'
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
              class="text-zinc-900 hover:text-red-600"
            >
              {{ row.name }}
            </NuxtLink>
          </div>
        </div>
      </template>

      <template #division-data="{ row }">
        <DivisionBadge :division="row.division" />
      </template>

      <template #record-data="{ row }">
        <div>
          <div class="text-zinc-900">
            {{ row.record }}
          </div>
          <div v-if="row.knockouts > 0" class="text-sm text-zinc-500">
            {{ row.knockouts }} KOs
          </div>
        </div>
      </template>

      <template #status-data="{ row }">
        <StatusBadge :active="row.active" />
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
