<script setup lang="ts">
import type { BoxerBout } from '~/types'

interface Fight extends BoxerBout {
  id?: number
}

interface Props {
  fights: Fight[]
}

const props = defineProps<Props>()

// Generate opponent boxer link
function getOpponentLink(opponentName: string): string {
  return `/boxers/${opponentName.toLowerCase().replace(/\s+/g, '-')}`
}

// Format date - handles "MMM YY" format like "Mar 07" for March 2007
function formatDate(date: string | null | undefined): string {
  if (!date) return 'N/A'
  
  // Check if it's in "MMM YY" format (e.g., "Mar 07")
  const monthYearPattern = /^([A-Za-z]{3})\s+(\d{2})$/
  const match = date.match(monthYearPattern)
  
  if (match) {
    const month = match[1]
    const year = match[2]
    // Convert 2-digit year to 4-digit
    // Assume 00-30 is 2000-2030, 31-99 is 1931-1999
    const fullYear = parseInt(year) <= 30 ? `20${year}` : `19${year}`
    return `${month} ${fullYear}`
  }
  
  // Return as-is if not in expected format
  return date
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

// Filter out Round and Title columns, keep Division
const columns = allColumns.filter(col => 
  col.key !== 'result_round' && col.key !== 'title_fight'
)
</script>

<template>
  <div id="fight-history" class="my-24">
    <div class="mb-4">
      <h2 class="text-lg font-semibold text-zinc-900">Fights</h2>
    </div>
    
    <div class="relative border border-zinc-200 rounded-lg" v-if="fights.length > 0">
      <UTable 
        :rows="fights" 
        :columns="columns"
        :sort="{ column: 'bout_date', direction: 'desc' }"
        :ui="{
          wrapper: 'relative bg-white',
          base: 'min-w-full table-fixed',
          divide: 'divide-y divide-zinc-200',
          thead: 'bg-zinc-50 border-b border-zinc-200',
            tbody: 'divide-y divide-zinc-200',
          tr: {
            base: 'hover:bg-zinc-50 transition-colors border-b border-zinc-100',
            selected: 'bg-zinc-50'
          },
          th: {
            base: 'text-left rtl:text-right',
            padding: 'px-4 py-3.5',
            color: 'text-zinc-900',
            font: 'font-semibold',
            size: 'text-sm'
          },
          td: {
            base: 'whitespace-nowrap',
            padding: 'px-4 py-4',
            color: 'text-zinc-600',
            font: '',
            size: 'text-sm'
          }
        }"
      >
        <template #fight_number-data="{ row, index }">
          <span class="text-zinc-500 text-sm">{{ fights.length - index }}</span>
        </template>
        
        <template #bout_date-data="{ row }">
          <span class="text-zinc-900">
            {{ formatDate(row.boutDate) }}
          </span>
        </template>
        
        <template #opponent_name-data="{ row }">
          <div class="space-y-1">
            <NuxtLink 
              :to="getOpponentLink(row.opponentName)"
              class="font-medium text-zinc-900 hover:text-primary-600 transition-colors"
            >
              {{ row.opponentName }}
            </NuxtLink>
            <div class="text-gray-500 text-sm">{{ row.opponentRecord }}</div>
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
            <div class="text-xs text-zinc-600">
              {{ row.resultMethod === 'ko' || row.resultMethod === 'tko' ? row.resultMethod.toUpperCase() : row.resultMethod }}
            </div>
          </div>
        </template>
        
        <template #result_round-data="{ row }">
          <span class="text-zinc-700">{{ row.resultRound }}</span>
        </template>
        
        <template #venue_name-data="{ row }">
          <span class="text-gray-500 text-sm">{{ row.venueName || 'N/A' }}</span>
        </template>
        
        <template #title_fight-data="{ row }">
          <UBadge 
            v-if="row.titleFight"
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
      <p class="text-zinc-600">No fight history available</p>
    </div>
  </div>
</template>