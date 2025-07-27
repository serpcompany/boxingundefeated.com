<script setup lang="ts">
import type { Boxer } from '~/types/Boxing'
import { mockBoxers, mockDivisions } from '~/data/boxing-data'

async function fetchBoxerData(slug: string): Promise<Boxer> {
  const boxer = mockBoxers.find(b => b.slug === slug)
  
  if (!boxer) {
    throw new Error(`Boxer with slug "${slug}" not found`)
  }
  
  return boxer
}

const route = useRoute()
const slug = route.params.slug as string

const pending = ref(false)
const error = ref(false)
const boxer = ref<Boxer | null>(null)

onMounted(async () => {
  try {
    pending.value = true
    boxer.value = await fetchBoxerData(slug)
  }
  catch (err) {
    error.value = true
    console.error('Failed to fetch boxer data:', err)
  }
  finally {
    pending.value = false
  }
})

if (import.meta.server || import.meta.env.NODE_ENV === 'test') {
  try {
    boxer.value = await fetchBoxerData(slug)
  }
  catch {
    error.value = true
  }
}

const division = computed(() => {
  if (!boxer.value) return null
  return mockDivisions.find(d => d.slug === boxer.value.division)
})

function formatRecord(boxer: Boxer): string {
  return `${boxer.record.wins}-${boxer.record.losses}-${boxer.record.draws}`
}

function calculateKOPercentage(boxer: Boxer): string {
  if (boxer.record.wins === 0) return '0'
  return ((boxer.record.knockouts / boxer.record.wins) * 100).toFixed(1)
}

function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

function getTotalFights(boxer: Boxer): number {
  return boxer.record.wins + boxer.record.losses + boxer.record.draws
}

// Sample fight data - replace with real data
const mockFights = ref([
  { id: 1, date: '2024-03-15', opponent: 'John Smith', result: 'W', method: 'KO', round: 3, venue: 'Madison Square Garden, NY' },
  { id: 2, date: '2023-11-20', opponent: 'Mike Johnson', result: 'W', method: 'UD', round: 12, venue: 'MGM Grand, Las Vegas' },
  { id: 3, date: '2023-07-08', opponent: 'Carlos Rodriguez', result: 'L', method: 'SD', round: 12, venue: 'Staples Center, LA' },
  { id: 4, date: '2023-03-22', opponent: 'Tommy Lee', result: 'W', method: 'TKO', round: 7, venue: 'Barclays Center, Brooklyn' },
  { id: 5, date: '2022-12-01', opponent: 'Roberto Garcia', result: 'D', method: 'Draw', round: 10, venue: 'T-Mobile Arena, Las Vegas' },
  { id: 6, date: '2022-08-15', opponent: 'David Martinez', result: 'W', method: 'KO', round: 1, venue: 'Mandalay Bay, Las Vegas' },
  { id: 7, date: '2022-04-20', opponent: 'James Wilson', result: 'W', method: 'UD', round: 12, venue: 'AT&T Stadium, Dallas' },
  { id: 8, date: '2021-12-10', opponent: 'Anthony Brown', result: 'W', method: 'TKO', round: 9, venue: 'Chase Center, San Francisco' },
  { id: 9, date: '2021-07-04', opponent: 'Michael Davis', result: 'W', method: 'MD', round: 12, venue: 'T-Mobile Arena, Las Vegas' },
  { id: 10, date: '2021-02-14', opponent: 'Frank Thomas', result: 'W', method: 'KO', round: 5, venue: 'Madison Square Garden, NY' },
])

// Table columns configuration
const columns = [
  {
    key: 'date',
    label: 'Date',
    sortable: true
  },
  {
    key: 'opponent',
    label: 'Opponent',
    sortable: true
  },
  {
    key: 'result',
    label: 'Result',
    sortable: true
  },
  {
    key: 'method',
    label: 'Method'
  },
  {
    key: 'round',
    label: 'Round',
    sortable: true
  },
  {
    key: 'venue',
    label: 'Venue'
  }
]
</script>

<template>
  <!-- Loading State -->
  <div
    v-if="pending"
    class="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center"
  >
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4" />
      <p class="text-zinc-600 dark:text-zinc-400">
        Loading boxer details...
      </p>
    </div>
  </div>

  <!-- Error State -->
  <div
    v-else-if="error"
    class="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center"
  >
    <div class="text-center">
      <h1 class="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
        Boxer Not Found
      </h1>
      <p class="text-zinc-600 dark:text-zinc-400 mb-4">
        The boxer "{{ slug }}" could not be found.
      </p>
      <NuxtLink to="/boxers" class="text-red-600 hover:text-red-700 dark:text-red-400">
        ← Back to Boxers
      </NuxtLink>
    </div>
  </div>

  <!-- Boxer Content -->
  <div v-else-if="boxer" class="min-h-screen bg-zinc-50 dark:bg-zinc-900">
    <!-- Hero Section -->
    <div class="bg-red-600 text-white min-h-[350px] flex items-center">
      <div class="max-w-7xl mx-auto px-6 lg:px-8 py-24 w-full">
        <!-- Breadcrumb -->
        <nav class="flex items-center gap-2 text-sm text-red-200 mb-6">
          <NuxtLink to="/boxers" class="hover:text-white">
            Boxers
          </NuxtLink>
          <span>/</span>
          <span class="text-white">{{ boxer.name }}</span>
        </nav>

        <div class="flex items-start gap-8">
          <!-- Main Info -->
          <div class="flex-1">
            <h1 class="text-4xl font-bold mb-4">
              {{ boxer.name }}
              <span v-if="boxer.nickname" class="text-red-200 font-normal">
                "{{ boxer.nickname }}"
              </span>
            </h1>
            
            <div class="flex flex-wrap items-center gap-6 text-lg">
              <span class="text-red-100">
                {{ formatRecord(boxer) }} ({{ boxer.record.knockouts }} KOs)
              </span>
              <span v-if="boxer.division" class="text-red-100">
                {{ division?.name }}
              </span>
              <span v-if="boxer.nationality" class="text-red-100">
                {{ boxer.nationality }}
              </span>
              <span v-if="boxer.active" class="text-green-300">
                Active
              </span>
              <span v-else class="text-red-200">
                Retired
              </span>
            </div>
          </div>

          <!-- Image -->
          <div v-if="boxer.image" class="hidden lg:block">
            <img
              :src="boxer.image"
              :alt="boxer.name"
              class="w-32 h-32 rounded-lg object-cover shadow-lg"
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-6 lg:px-8 py-12">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Main Content -->
        <div class="lg:col-span-2 space-y-8">
          <!-- Stats Grid -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
              <div class="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Wins</div>
              <div class="text-2xl font-semibold text-zinc-900 dark:text-white">{{ boxer.record.wins }}</div>
            </div>
            <div class="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
              <div class="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Losses</div>
              <div class="text-2xl font-semibold text-zinc-900 dark:text-white">{{ boxer.record.losses }}</div>
            </div>
            <div class="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
              <div class="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Draws</div>
              <div class="text-2xl font-semibold text-zinc-900 dark:text-white">{{ boxer.record.draws }}</div>
            </div>
            <div class="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
              <div class="text-sm text-zinc-600 dark:text-zinc-400 mb-1">KO Rate</div>
              <div class="text-2xl font-semibold text-zinc-900 dark:text-white">{{ calculateKOPercentage(boxer) }}%</div>
            </div>
          </div>

          <!-- Biography -->
          <div v-if="boxer.bio">
            <h2 class="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Biography</h2>
            <p class="text-zinc-600 dark:text-zinc-400 leading-relaxed">{{ boxer.bio }}</p>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Info Card -->
          <div class="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800">
            <h3 class="text-base font-semibold text-zinc-900 dark:text-white mb-4">Information</h3>
            <dl class="space-y-3">
              <!-- Basic Info -->
              <div v-if="boxer.birthDate" class="flex justify-between">
                <dt class="text-sm text-zinc-600 dark:text-zinc-400">Born</dt>
                <dd class="text-sm text-zinc-900 dark:text-white">{{ new Date(boxer.birthDate).toLocaleDateString() }}</dd>
              </div>
              <div v-if="boxer.birthDate" class="flex justify-between">
                <dt class="text-sm text-zinc-600 dark:text-zinc-400">Age</dt>
                <dd class="text-sm text-zinc-900 dark:text-white">{{ calculateAge(boxer.birthDate) }} years</dd>
              </div>
              <div v-if="boxer.birthPlace" class="flex justify-between">
                <dt class="text-sm text-zinc-600 dark:text-zinc-400">Birthplace</dt>
                <dd class="text-sm text-zinc-900 dark:text-white text-right">{{ boxer.birthPlace }}</dd>
              </div>
              <div v-if="boxer.nationality" class="flex justify-between">
                <dt class="text-sm text-zinc-600 dark:text-zinc-400">Nationality</dt>
                <dd class="text-sm text-zinc-900 dark:text-white">{{ boxer.nationality }}</dd>
              </div>
              <div v-if="division" class="flex justify-between">
                <dt class="text-sm text-zinc-600 dark:text-zinc-400">Division</dt>
                <dd class="text-sm text-zinc-900 dark:text-white">{{ division.name }}</dd>
              </div>
              
              <!-- Physical Stats -->
              <div v-if="boxer.height" class="flex justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <dt class="text-sm text-zinc-600 dark:text-zinc-400">Height</dt>
                <dd class="text-sm text-zinc-900 dark:text-white">{{ boxer.height }}</dd>
              </div>
              <div v-if="boxer.reach" class="flex justify-between">
                <dt class="text-sm text-zinc-600 dark:text-zinc-400">Reach</dt>
                <dd class="text-sm text-zinc-900 dark:text-white">{{ boxer.reach }}</dd>
              </div>
              <div v-if="boxer.stance" class="flex justify-between">
                <dt class="text-sm text-zinc-600 dark:text-zinc-400">Stance</dt>
                <dd class="text-sm text-zinc-900 dark:text-white capitalize">{{ boxer.stance }}</dd>
              </div>
              <div v-if="boxer.reach && boxer.height" class="flex justify-between">
                <dt class="text-sm text-zinc-600 dark:text-zinc-400">Reach Advantage</dt>
                <dd class="text-sm text-zinc-900 dark:text-white">+{{ (parseInt(boxer.reach) - parseInt(boxer.height)).toFixed(0) }}"</dd>
              </div>
              
              <!-- Career Stats -->
              <div class="flex justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <dt class="text-sm text-zinc-600 dark:text-zinc-400">Total Fights</dt>
                <dd class="text-sm text-zinc-900 dark:text-white">{{ getTotalFights(boxer) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-sm text-zinc-600 dark:text-zinc-400">Win Rate</dt>
                <dd class="text-sm text-zinc-900 dark:text-white">{{ boxer.record.wins > 0 ? ((boxer.record.wins / getTotalFights(boxer)) * 100).toFixed(1) : 0 }}%</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-sm text-zinc-600 dark:text-zinc-400">Knockouts</dt>
                <dd class="text-sm text-zinc-900 dark:text-white">{{ boxer.record.knockouts }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-sm text-zinc-600 dark:text-zinc-400">KO Rate</dt>
                <dd class="text-sm text-zinc-900 dark:text-white">{{ calculateKOPercentage(boxer) }}%</dd>
              </div>
              <div v-if="boxer.ranking" class="flex justify-between">
                <dt class="text-sm text-zinc-600 dark:text-zinc-400">World Rank</dt>
                <dd class="text-sm text-zinc-900 dark:text-white">#{{ boxer.ranking }}</dd>
              </div>
              <div v-if="boxer.isChampion" class="flex justify-between">
                <dt class="text-sm text-zinc-600 dark:text-zinc-400">Status</dt>
                <dd class="text-sm text-zinc-900 dark:text-white">
                  <UBadge color="amber" variant="subtle" size="xs">Champion</UBadge>
                </dd>
              </div>
            </dl>
          </div>

          <!-- More in Division -->
          <div class="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800">
            <h3 class="text-base font-semibold text-zinc-900 dark:text-white mb-2">More {{ division?.name }} Fighters</h3>
            <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Explore other boxers in this division
            </p>
            <UButton
              :to="`/divisions/${boxer.division}`"
              variant="ghost"
              color="gray"
              size="sm"
              class="w-full"
            >
              View All {{ division?.name }}
            </UButton>
          </div>
        </div>
      </div>
      
      <!-- Fight History - Full Width at Bottom -->
      <div class="mt-12">
        <h2 class="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Fight History</h2>
        <div class="h-[400px] overflow-auto">
          <UTable 
            :rows="mockFights" 
            :columns="columns"
            :sort="{ column: 'date', direction: 'desc' }"
            :ui="{
              wrapper: 'relative overflow-x-auto bg-white dark:bg-zinc-900 shadow ring-1 ring-zinc-200 dark:ring-zinc-800 rounded-lg',
              base: 'min-w-full table-fixed',
              divide: 'divide-y divide-zinc-200 dark:divide-zinc-800',
              thead: 'sticky top-0 bg-white dark:bg-zinc-900 z-10',
              tbody: 'divide-y divide-zinc-200 dark:divide-zinc-800',
              tr: {
                base: 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors',
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
            <template #date-data="{ row }">
              <time :datetime="row.date" class="text-zinc-900 dark:text-white">
                {{ new Date(row.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) }}
              </time>
            </template>
            
            <template #opponent-data="{ row }">
              <span class="font-medium text-zinc-900 dark:text-white">{{ row.opponent }}</span>
            </template>
            
            <template #result-data="{ row }">
              <UBadge 
                :color="row.result === 'W' ? 'green' : row.result === 'L' ? 'red' : 'gray'"
                variant="subtle"
                size="xs"
              >
                {{ row.result === 'W' ? 'Win' : row.result === 'L' ? 'Loss' : 'Draw' }}
              </UBadge>
            </template>
            
            <template #method-data="{ row }">
              <span class="text-zinc-700 dark:text-zinc-300">{{ row.method }}</span>
            </template>
            
            <template #round-data="{ row }">
              <span class="text-zinc-700 dark:text-zinc-300">R{{ row.round }}</span>
            </template>
            
            <template #venue-data="{ row }">
              <span class="text-zinc-600 dark:text-zinc-400 text-xs">{{ row.venue }}</span>
            </template>
          </UTable>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Keep styles minimal and clean */
</style>