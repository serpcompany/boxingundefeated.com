<script setup lang="ts">
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
const statusFilter = ref('')
const nationalityFilter = ref('')
const divisionFilter = ref('')
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
      key: 'record',
      label: 'Record'
    },
    {
      key: 'nationality',
      label: 'Nationality',
      sortable: true
    }
  ]
  
  if (props.showDivision) {
    cols.splice(2, 0, {
      key: 'division',
      label: 'Division',
      sortable: true
    })
  }
  
  cols.push({
    key: 'status',
    label: 'Status'
  })
  
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
  return [
    { label: 'All Divisions', value: '' },
    ...divisions.map(d => ({ label: d, value: d }))
  ]
})

// Apply filters to data
const filteredData = computed(() => {
  let filtered = tableData.value
  
  if (statusFilter.value) {
    filtered = filtered.filter(boxer => boxer.status === statusFilter.value)
  }
  
  if (nationalityFilter.value) {
    filtered = filtered.filter(boxer => boxer.nationality === nationalityFilter.value)
  }
  
  if (divisionFilter.value && props.showDivision) {
    filtered = filtered.filter(boxer => boxer.division === divisionFilter.value)
  }
  
  return filtered
})

// Pagination
const totalPages = computed(() => Math.ceil(filteredData.value.length / props.pageSize))
const paginatedData = computed(() => {
  const start = (page.value - 1) * props.pageSize
  const end = start + props.pageSize
  return filteredData.value.slice(start, end)
})

// Row click handler
function onRowClick(row: any) {
  navigateTo(`/boxers/${row.slug}`)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Filters -->
    <div class="flex flex-wrap gap-4 mb-6">
      <USelectMenu
        v-model="statusFilter"
        :options="statusOptions"
        option-attribute="label"
        value-attribute="value"
        placeholder="Status"
        class="w-40"
      />
      
      <USelectMenu
        v-model="nationalityFilter"
        :options="nationalityOptions"
        option-attribute="label"
        value-attribute="value"
        placeholder="Nationality"
        class="w-48"
      />
      
      <USelectMenu
        v-if="showDivision"
        v-model="divisionFilter"
        :options="divisionOptions"
        option-attribute="label"
        value-attribute="value"
        placeholder="Division"
        class="w-48"
      />
      
      <!-- Results count -->
      <div class="flex items-center text-sm text-zinc-600 dark:text-zinc-400 ml-auto">
        Showing {{ paginatedData.length }} of {{ filteredData.length }} fighters
      </div>
    </div>

    <UTable 
      :rows="paginatedData" 
      :columns="columns"
      :loading="false"
      class="cursor-pointer border border-zinc-200 dark:border-zinc-700 shadow-sm rounded-lg overflow-hidden"
      :ui="{
        wrapper: 'relative overflow-hidden',
        base: 'min-w-full table-fixed',
        thead: 'bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700',
        th: { 
          base: 'px-4 py-3.5 text-left text-sm font-semibold text-zinc-900 dark:text-white'
        },
        tbody: 'bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-700',
        tr: { 
          base: 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors duration-150',
          selected: 'bg-primary-50 dark:bg-primary-950'
        },
        td: { 
          base: 'px-4 py-3 whitespace-nowrap text-sm text-zinc-900 dark:text-zinc-100 border-r border-zinc-100 dark:border-zinc-800 last:border-r-0'
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
            <div class="text-zinc-900 dark:text-white">
              {{ row.name }}
            </div>
          </div>
        </div>
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

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex justify-center">
      <UPagination 
        v-model="page" 
        :page-count="props.pageSize" 
        :total="filteredData.length"
        :max="7"
      />
    </div>
  </div>
</template>