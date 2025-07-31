<script setup lang="ts">
import type { BoxerBout } from '~/types/Boxing'

interface Fight extends BoxerBout {
  id?: number
}

interface Props {
  fights: Fight[]
}

const props = defineProps<Props>()


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
    key: 'fight_number',
    label: 'Fight',
    sortable: false
  },
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

// Use all columns
const columns = allColumns
</script>

<template>
  <div id="fight-history" class="my-24">
    <div class="mb-4">
      <h2 class="text-lg font-semibold text-zinc-900 dark:text-white">Fight History</h2>
    </div>
    
    <div class="relative border border-zinc-200 dark:border-zinc-700 rounded-lg" v-if="fights.length > 0">
      <UTable 
        :rows="fights" 
        :columns="columns"
        :sort="{ column: 'bout_date', direction: 'desc' }"
        :ui="{
          wrapper: 'relative bg-white dark:bg-zinc-900',
          base: 'min-w-full table-fixed',
          divide: 'divide-y divide-zinc-200 dark:divide-zinc-700',
          thead: 'bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700',
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
        <template #fight_number-data="{ row, index }">
          <span class="text-zinc-500 dark:text-zinc-400 text-sm">{{ fights.length - index }}</span>
        </template>
        
        <template #bout_date-data="{ row }">
          <time :datetime="row.bout_date" class="text-zinc-900 dark:text-white">
            {{ formatDate(row.bout_date) }}
          </time>
        </template>
        
        <template #opponent_name-data="{ row }">
          <div class="space-y-1">
            <NuxtLink 
              :to="`/boxers/${row.opponent_name.toLowerCase().replace(/\s+/g, '-')}`"
              class="font-medium text-zinc-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              {{ row.opponent_name }}
            </NuxtLink>
            <div class="text-gray-500 dark:text-gray-400 text-sm">{{ row.opponent_record }}</div>
          </div>
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