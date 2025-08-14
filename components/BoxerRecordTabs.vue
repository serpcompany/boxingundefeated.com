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
  return props.boxer.amateurTotalBouts && props.boxer.amateurTotalBouts > 0
})

// Professional stats
const professionalStats = computed(() => {
  const wins = props.boxer.proWins || 0
  const losses = props.boxer.proLosses || 0
  const draws = props.boxer.proDraws || 0
  const kos = props.boxer.proWinsByKnockout || 0

  return [
    { label: 'Wins', value: wins, color: 'green' },
    { label: 'Losses', value: losses, color: 'red' },
    { label: 'Draws', value: draws, color: 'neutral' },
    { label: 'KO Rate', value: `${calculateKOPercentage(wins, kos)}%` }
  ]
})

// Amateur stats
const amateurStats = computed(() => {
  const wins = props.boxer.amateurWins || 0
  const losses = props.boxer.amateurLosses || 0
  const draws = props.boxer.amateurDraws || 0
  const kos = props.boxer.amateurWinsByKnockout || 0

  return [
    { label: 'Wins', value: wins, color: 'green' },
    { label: 'Losses', value: losses, color: 'red' },
    { label: 'Draws', value: draws, color: 'neutral' },
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
  <div id="professional-record" class="bg-white rounded-lg border border-zinc-200 overflow-hidden">
    <!-- Tab Headers -->
    <div v-if="hasAmateurRecord" class="border-b border-zinc-200">
      <div class="flex">
        <button
          v-for="(tab, index) in tabs"
          :key="tab.label"
          @click="selectedTab = index"
          :class="[
            'flex-1 px-4 py-3 text-sm font-medium transition-colors',
            selectedTab === index
              ? 'bg-zinc-50 text-zinc-900 border-b-2 border-red-600'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
          ]"
        >
          {{ tab.label }} Record
        </button>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="p-6">
      <h3 class="text-lg font-semibold text-zinc-900 mb-4">
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
                'text-green-600': stat.color === 'green',
                'text-red-600': stat.color === 'red',
                'text-zinc-600': stat.color === 'neutral',
                'text-orange-600': stat.color === 'orange',
                'text-zinc-900': !stat.color
              }
            ]"
          >
            {{ stat.value }}
          </div>
          <div class="text-sm text-zinc-600">
            {{ stat.label }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
