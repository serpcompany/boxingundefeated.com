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

// Table columns configuration
const columns = [
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
    key: 'result_method',
    label: 'Method'
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
</script>

<template>
  <div class="my-20">
    <h2 class="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Fight History</h2>
    <div class="relative max-h-[800px] border-2 border-zinc-200 dark:border-zinc-700 rounded-lg shadow-md overflow-hidden" v-if="fights.length > 0">
      <UTable 
        :rows="fights" 
        :columns="columns"
        :sort="{ column: 'bout_date', direction: 'desc' }"
        :ui="{
          wrapper: 'h-full overflow-auto bg-white dark:bg-zinc-900',
          base: 'min-w-full table-fixed',
          divide: 'divide-y divide-zinc-200 dark:divide-zinc-700',
          thead: 'sticky top-0 bg-zinc-50 dark:bg-zinc-800 z-10 border-b-2 border-zinc-300 dark:border-zinc-600',
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
          <span class="font-medium text-zinc-900 dark:text-white">{{ row.opponent_name }}</span>
        </template>
        
        <template #opponent_record-data="{ row }">
          <span class="text-zinc-600 dark:text-zinc-400 text-xs">{{ row.opponent_record }}</span>
        </template>
        
        <template #result-data="{ row }">
          <UBadge 
            :color="row.result === 'win' ? 'green' : row.result === 'loss' ? 'red' : 'gray'"
            variant="subtle"
            size="xs"
          >
            {{ row.result === 'win' ? 'Win' : row.result === 'loss' ? 'Loss' : row.result === 'draw' ? 'Draw' : 'NC' }}
          </UBadge>
        </template>
        
        <template #result_method-data="{ row }">
          <span class="text-zinc-700 dark:text-zinc-300 uppercase">{{ row.result_method }}</span>
        </template>
        
        <template #result_round-data="{ row }">
          <span class="text-zinc-700 dark:text-zinc-300">R{{ row.result_round }}</span>
        </template>
        
        <template #venue_name-data="{ row }">
          <span class="text-zinc-600 dark:text-zinc-400 text-xs">{{ row.venue_name }}</span>
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
        </template>
      </UTable>
    </div>
    <div v-else class="bg-white rounded-lg p-8 text-center border border-zinc-200">
      <p class="text-zinc-600 dark:text-zinc-400">No fight history available</p>
    </div>
  </div>
</template>