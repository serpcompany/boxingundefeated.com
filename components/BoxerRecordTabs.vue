<script setup lang="ts">
import type { Boxer } from '~/types'

interface Props {
  boxer: Boxer
}

const props = defineProps<Props>()

const selectedTab = ref(0)

function calculateKOPercentage(wins: number, kos: number): string {
  if (wins === 0) return '0'
  return ((kos / wins) * 100).toFixed(1)
}

// Check if boxer has amateur record
const hasAmateurRecord = computed(() => {
  return props.boxer.amateur_total_bouts && props.boxer.amateur_total_bouts > 0
})

// Professional stats
const professionalStats = computed(() => {
  const wins = props.boxer.pro_wins || props.boxer.record?.wins || 0
  const losses = props.boxer.pro_losses || props.boxer.record?.losses || 0
  const draws = props.boxer.pro_draws || props.boxer.record?.draws || 0
  const kos = props.boxer.pro_wins_by_knockout || props.boxer.record?.knockouts || 0
  
  return [
    { label: 'Wins', value: wins, color: 'green' },
    { label: 'Losses', value: losses, color: 'red' },
    { label: 'Draws', value: draws, color: 'gray' },
    { label: 'KO Rate', value: `${calculateKOPercentage(wins, kos)}%` }
  ]
})

// Amateur stats
const amateurStats = computed(() => {
  const wins = props.boxer.amateur_wins || 0
  const losses = props.boxer.amateur_losses || 0
  const draws = props.boxer.amateur_draws || 0
  const kos = props.boxer.amateur_wins_by_knockout || 0
  
  return [
    { label: 'Wins', value: wins, color: 'green' },
    { label: 'Losses', value: losses, color: 'red' },
    { label: 'Draws', value: draws, color: 'gray' },
    { label: 'KOs', value: kos }
  ]
})

const tabs = computed(() => {
  const baseTabs = [{
    label: 'Professional',
    stats: professionalStats.value
  }]
  
  if (hasAmateurRecord.value) {
    baseTabs.push({
      label: 'Amateur',
      stats: amateurStats.value
    })
  }
  
  return baseTabs
})

const currentStats = computed(() => tabs.value[selectedTab.value].stats)
</script>

<template>
  <div id="professional-record" class="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
    <!-- Tab Headers -->
    <div v-if="hasAmateurRecord" class="border-b border-zinc-200 dark:border-zinc-700">
      <div class="flex">
        <button
          v-for="(tab, index) in tabs"
          :key="tab.label"
          @click="selectedTab = index"
          :class="[
            'flex-1 px-4 py-3 text-sm font-medium transition-colors',
            selectedTab === index
              ? 'bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white border-b-2 border-red-600'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
          ]"
        >
          {{ tab.label }} Record
        </button>
      </div>
    </div>
    
    <!-- Stats Grid -->
    <div class="p-6">
      <h3 class="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
        {{ tabs[selectedTab].label }} Record
      </h3>
      
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          v-for="stat in currentStats"
          :key="stat.label"
          class="text-center"
        >
          <div
            :class="[
              'text-2xl md:text-3xl font-bold mb-1',
              {
                'text-green-600 dark:text-green-500': stat.color === 'green',
                'text-red-600 dark:text-red-500': stat.color === 'red',
                'text-zinc-600 dark:text-zinc-400': stat.color === 'gray',
                'text-orange-600 dark:text-orange-500': stat.color === 'orange',
                'text-zinc-900 dark:text-white': !stat.color
              }
            ]"
          >
            {{ stat.value }}
          </div>
          <div class="text-sm text-zinc-600 dark:text-zinc-400">
            {{ stat.label }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>