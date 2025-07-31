<script setup lang="ts">
import type { BoxerBout } from '~/types/Boxing'

interface Fight extends BoxerBout {
  id?: number
}

interface Props {
  fights: Fight[]
}

const props = defineProps<Props>()

// Column visibility state
const selectedColumns = ref(['bout_date', 'opponent_name', 'opponent_record', 'result', 'result_round', 'venue_name', 'title_fight'])

// Format date consistently
function formatDate(date: string | null | undefined): string {
  if (!date) return 'N/A'
  try {
    const d = new Date(date)
    const month = d.getMonth() + 1
    const day = d.getDate()
    const year = d.getFullYear()
    return `${month}/${day}/${year}`
  } catch {
    return 'N/A'
  }
}

// All available columns
const allColumns = [
  {
    key: 'bout_date',
    label: 'Date',
    sortable: true
  },
  {
    key: 'opponent_name',
    label: 'Opponent',
    sortable: true
  },
  {
    key: 'opponent_record',
    label: 'Opponent Record'
  },
  {
    key: 'result',
    label: 'Result',
    sortable: true
  },
  {
    key: 'result_round',
    label: 'Round',
    sortable: true
  },
  {
    key: 'venue_name',
    label: 'Venue'
  },
  {
    key: 'title_fight',
    label: 'Title'
  }
]

// Displayed columns based on selection
const columns = computed(() => {
  return allColumns.filter(col => selectedColumns.value.includes(col.key))
})
</script>

<template>
  <div id="fight-history" class="my-20">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-zinc-900 dark:text-white">Fight History</h2>
      
      <!-- Column Display Dropdown -->
      <UDropdown :items="[allColumns]" :popper="{ placement: 'bottom-start' }">
        <UButton color="white" variant="solid" size="sm" icon="i-heroicons-adjustments-horizontal-20-solid" trailing>
          Display
        </UButton>
        
        <template #item="{ item }">
          <div class="flex items-center gap-2 min-w-0">
            <UCheckbox 
              :model-value="selectedColumns.includes(item.key)"
              @update:model-value="(checked) => {
                if (checked) {
                  selectedColumns = [...selectedColumns, item.key]
                } else {
                  selectedColumns = selectedColumns.filter(col => col !== item.key)
                }
              }"
            />
            <span class="truncate">{{ item.label }}</span>
          </div>
        </template>
      </UDropdown>
    </div>
    
    <div class="relative border border-zinc-200 dark:border-zinc-700 rounded-lg" v-if="fights.length > 0">
      <UTable 
        :rows="fights" 
        :columns="columns"
        :sort="{ column: 'bout_date', direction: 'desc' }"
        class="max-h-[800px]"
        :ui="{
          wrapper: 'relative overflow-auto max-h-[800px] bg-white dark:bg-zinc-900',
          base: 'min-w-full table-fixed',
          divide: 'divide-y divide-zinc-200 dark:divide-zinc-700',
          thead: 'sticky top-0 bg-zinc-50 dark:bg-zinc-800 z-10 border-b border-zinc-200 dark:border-zinc-700',
            tbody: 'divide-y divide-zinc-200 dark:divide-zinc-700',
          tr: {
            base: 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors border-b border-zinc-100 dark:border-zinc-800',
            selected: 'bg-zinc-50 dark:bg-zinc-800/50'
          },
          th: {
            base: 'text-left rtl:text-right',
            padding: 'px-4 py-3.5',
            color: 'text-zinc-900 dark:text-white',
            font: 'font-semibold',
            size: 'text-sm'
          },
          td: {
            base: 'whitespace-nowrap',
            padding: 'px-4 py-4',
            color: 'text-zinc-600 dark:text-zinc-400',
            font: '',
            size: 'text-sm'
          }
        }"
      >
        <template #bout_date-data="{ row }">
          <time :datetime="row.bout_date" class="text-zinc-900 dark:text-white">
            {{ formatDate(row.bout_date) }}
          </time>
        </template>
        
        <template #opponent_name-data="{ row }">
          <NuxtLink 
            :to="`/boxers/${row.opponent_name.toLowerCase().replace(/\s+/g, '-')}`"
            class="font-medium text-zinc-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            {{ row.opponent_name }}
          </NuxtLink>
        </template>
        
        <template #opponent_record-data="{ row }">
          <span class="text-gray-500 dark:text-gray-400 text-sm">{{ row.opponent_record }}</span>
        </template>
        
        <template #result-data="{ row }">
          <div class="space-y-1">
            <UBadge 
              :color="row.result === 'win' ? 'green' : row.result === 'loss' ? 'red' : 'gray'"
              variant="subtle"
              size="xs"
            >
              {{ row.result === 'win' ? 'Win' : row.result === 'loss' ? 'Loss' : row.result === 'draw' ? 'Draw' : 'NC' }}
            </UBadge>
            <div class="text-xs text-zinc-600 dark:text-zinc-400">
              {{ row.result_method === 'ko' || row.result_method === 'tko' ? row.result_method.toUpperCase() : row.result_method }}
            </div>
          </div>
        </template>
        
        <template #result_round-data="{ row }">
          <span class="text-zinc-700 dark:text-zinc-300">{{ row.result_round }}</span>
        </template>
        
        <template #venue_name-data="{ row }">
          <span class="text-gray-500 dark:text-gray-400 text-sm">{{ row.venue_name }}</span>
        </template>
        
        <template #title_fight-data="{ row }">
          <UBadge 
            v-if="row.title_fight"
            color="amber"
            variant="subtle"
            size="xs"
          >
            Title
          </UBadge>
          <span v-else></span>
        </template>
      </UTable>
    </div>
    <div v-else class="bg-white rounded-lg p-8 text-center border border-zinc-200">
      <p class="text-zinc-600 dark:text-zinc-400">No fight history available</p>
    </div>
  </div>
</template>