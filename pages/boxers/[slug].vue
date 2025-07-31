<script setup lang="ts">
import type { Boxer } from '~/types/Boxing'
import { mockDivisions } from '~/data/boxing-data'
import { findBoxerBySlug } from '~/utils/loadBoxerData'

const route = useRoute()
const slug = route.params.slug as string

// Use useAsyncData for proper SSR and hydration
const { data: boxer, pending, error } = await useAsyncData(
  `boxer-${slug}`,
  () => {
    const boxerData = findBoxerBySlug(slug)
    if (!boxerData) {
      throw createError({
        statusCode: 404,
        statusMessage: `Boxer with slug "${slug}" not found`
      })
    }
    return boxerData
  }
)

const division = computed(() => {
  if (!boxer.value) return null
  const divisionSlug = boxer.value.pro_division || boxer.value.division
  return mockDivisions.find(d => d.slug === divisionSlug)
})


function calculateKOPercentage(boxer: Boxer): string {
  const wins = boxer.pro_wins || boxer.record?.wins || 0
  const kos = boxer.pro_wins_by_knockout || boxer.record?.knockouts || 0
  if (wins === 0) return '0'
  return ((kos / wins) * 100).toFixed(1)
}

function calculateAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null
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
  if (boxer.pro_total_bouts !== undefined) {
    return boxer.pro_total_bouts
  }
  return (boxer.record?.wins || 0) + (boxer.record?.losses || 0) + (boxer.record?.draws || 0)
}

function formatHeight(height: string | null | undefined): string {
  return height || 'N/A'
}

function formatReach(reach: string | null | undefined): string {
  return reach || 'N/A'
}

// Format date consistently to avoid hydration mismatches
function formatDate(date: string | null | undefined): string {
  if (!date) return 'N/A'
  try {
    const d = new Date(date)
    // Use a consistent format that doesn't vary between server/client
    const month = d.getMonth() + 1
    const day = d.getDate()
    const year = d.getFullYear()
    return `${month}/${day}/${year}`
  } catch {
    return 'N/A'
  }
}

// Format bio content with basic markdown support
function formatBioContent(content: string): string {
  // Convert **bold** to <strong>
  let formatted = content.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-zinc-900 dark:text-white">$1</strong>')
  
  // Convert line breaks to <br> for paragraphs
  formatted = formatted.replace(/\n\n/g, '</p><p class="mb-4 text-zinc-600 dark:text-zinc-400">')
  
  // Convert bullet points
  formatted = formatted.replace(/• /g, '<span class="inline-block w-2 h-2 bg-zinc-400 dark:bg-zinc-600 rounded-full mr-2 mb-1"></span>')
  
  // Wrap in paragraph tags
  formatted = `<p class="mb-4 text-zinc-600 dark:text-zinc-400">${formatted}</p>`
  
  return formatted
}

// Use fights from boxer data or legacy bouts
const fights = computed(() => {
  if (!boxer.value) return []
  
  // Check if new format fights exist
  if (boxer.value.fights && boxer.value.fights.length > 0) {
    return boxer.value.fights.map((fight, index) => ({
      id: index + 1,
      ...fight
    }))
  }
  
  // Fall back to legacy bouts format
  if (boxer.value.bouts && boxer.value.bouts.length > 0) {
    return boxer.value.bouts.map((bout, index) => ({
      id: index + 1,
      bout_date: bout.date,
      opponent_name: bout.opponent,
      opponent_record: bout.opponent_record,
      result: bout.result.toLowerCase(),
      result_method: bout.method?.toLowerCase() || 'decision',
      result_round: bout.rounds,
      venue_name: bout.venue,
      title_fight: false,
      num_rounds_scheduled: 10 // Default
    }))
  }
  
  return []
})

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
  <!-- Error State -->
  <div
    v-if="error"
    class="min-h-screen bg-white flex items-center justify-center"
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

  <!-- Loading State -->
  <div
    v-else-if="pending"
    class="min-h-screen bg-white flex items-center justify-center"
  >
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4" />
      <p class="text-zinc-600 dark:text-zinc-400">
        Loading boxer details...
      </p>
    </div>
  </div>

  <!-- Boxer Content -->
  <div v-else-if="boxer" class="min-h-screen bg-white">
    <!-- Hero Section -->
    <BoxerHero :boxer="boxer" />

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-6 lg:px-8 py-12">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Left Sidebar - Info Card -->
        <div class="space-y-6">
          <!-- Info Card -->
          <div class="bg-white rounded-lg p-6 border border-zinc-200">
            <h3 class="text-base font-semibold text-zinc-900 dark:text-white mb-4">Information</h3>
            <dl class="space-y-3">
              <!-- Basic Info -->
              <div v-if="boxer.date_of_birth || boxer.birthDate" class="flex justify-between">
                <dt class="text-sm text-zinc-600 dark:text-zinc-400">Born</dt>
                <dd class="text-sm text-zinc-900 dark:text-white">{{ formatDate(boxer.date_of_birth || boxer.birthDate) }}</dd>
              </div>
              <div v-if="calculateAge(boxer.date_of_birth || boxer.birthDate)" class="flex justify-between">
                <dt class="text-sm text-zinc-600 dark:text-zinc-400">Age</dt>
                <dd class="text-sm text-zinc-900 dark:text-white">{{ calculateAge(boxer.date_of_birth || boxer.birthDate) }} years</dd>
              </div>
              <div v-if="boxer.birth_place || boxer.birthPlace" class="flex justify-between">
                <dt class="text-sm text-zinc-600 dark:text-zinc-400">Birthplace</dt>
                <dd class="text-sm text-zinc-900 dark:text-white text-right">{{ boxer.birth_place || boxer.birthPlace }}</dd>
              </div>
              <div v-if="boxer.residence" class="flex justify-between">
                <dt class="text-sm text-zinc-600 dark:text-zinc-400">Residence</dt>
                <dd class="text-sm text-zinc-900 dark:text-white text-right">{{ boxer.residence }}</dd>
              </div>
              <div v-if="boxer.nationality" class="flex justify-between">
                <dt class="text-sm text-zinc-600 dark:text-zinc-400">Nationality</dt>
                <dd class="text-sm text-zinc-900 dark:text-white">{{ boxer.nationality }}</dd>
              </div>
              <div v-if="boxer.gender" class="flex justify-between">
                <dt class="text-sm text-zinc-600 dark:text-zinc-400">Gender</dt>
                <dd class="text-sm text-zinc-900 dark:text-white capitalize">{{ boxer.gender }}</dd>
              </div>
              
              <!-- Physical Stats -->
              <div v-if="boxer.height" class="flex justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <dt class="text-sm text-zinc-600 dark:text-zinc-400">Height</dt>
                <dd class="text-sm text-zinc-900 dark:text-white">{{ formatHeight(boxer.height) }}</dd>
              </div>
              <div v-if="boxer.reach" class="flex justify-between">
                <dt class="text-sm text-zinc-600 dark:text-zinc-400">Reach</dt>
                <dd class="text-sm text-zinc-900 dark:text-white">{{ formatReach(boxer.reach) }}</dd>
              </div>
              <div v-if="boxer.weight" class="flex justify-between">
                <dt class="text-sm text-zinc-600 dark:text-zinc-400">Weight</dt>
                <dd class="text-sm text-zinc-900 dark:text-white">{{ boxer.weight }}</dd>
              </div>
              <div v-if="boxer.stance" class="flex justify-between">
                <dt class="text-sm text-zinc-600 dark:text-zinc-400">Stance</dt>
                <dd class="text-sm text-zinc-900 dark:text-white capitalize">{{ boxer.stance }}</dd>
              </div>
              
              <!-- Management Team -->
              <div v-if="boxer.promoter || boxer.trainer || boxer.manager || boxer.gym" class="pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <div v-if="boxer.promoter" class="flex justify-between mb-2">
                  <dt class="text-sm text-zinc-600 dark:text-zinc-400">Promoter</dt>
                  <dd class="text-sm text-zinc-900 dark:text-white text-right">{{ boxer.promoter }}</dd>
                </div>
                <div v-if="boxer.trainer" class="flex justify-between mb-2">
                  <dt class="text-sm text-zinc-600 dark:text-zinc-400">Trainer</dt>
                  <dd class="text-sm text-zinc-900 dark:text-white text-right">{{ boxer.trainer }}</dd>
                </div>
                <div v-if="boxer.manager" class="flex justify-between mb-2">
                  <dt class="text-sm text-zinc-600 dark:text-zinc-400">Manager</dt>
                  <dd class="text-sm text-zinc-900 dark:text-white text-right">{{ boxer.manager }}</dd>
                </div>
                <div v-if="boxer.gym" class="flex justify-between">
                  <dt class="text-sm text-zinc-600 dark:text-zinc-400">Gym</dt>
                  <dd class="text-sm text-zinc-900 dark:text-white text-right">{{ boxer.gym }}</dd>
                </div>
              </div>
              
              <!-- Professional Career Stats -->
              <div class="pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <div class="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Professional Career</div>
                <div v-if="boxer.pro_debut_date" class="flex justify-between mb-2">
                  <dt class="text-sm text-zinc-600 dark:text-zinc-400">Debut</dt>
                  <dd class="text-sm text-zinc-900 dark:text-white">{{ formatDate(boxer.pro_debut_date) }}</dd>
                </div>
                <div class="flex justify-between mb-2">
                  <dt class="text-sm text-zinc-600 dark:text-zinc-400">Total Fights</dt>
                  <dd class="text-sm text-zinc-900 dark:text-white">{{ boxer.pro_total_bouts || getTotalFights(boxer) }}</dd>
                </div>
                <div class="flex justify-between mb-2">
                  <dt class="text-sm text-zinc-600 dark:text-zinc-400">Total Rounds</dt>
                  <dd class="text-sm text-zinc-900 dark:text-white">{{ boxer.pro_total_rounds || 'N/A' }}</dd>
                </div>
                <div class="flex justify-between mb-2">
                  <dt class="text-sm text-zinc-600 dark:text-zinc-400">Win Rate</dt>
                  <dd class="text-sm text-zinc-900 dark:text-white">{{ boxer.pro_wins > 0 ? ((boxer.pro_wins / (boxer.pro_total_bouts || getTotalFights(boxer))) * 100).toFixed(1) : 0 }}%</dd>
                </div>
                <div class="flex justify-between mb-2">
                  <dt class="text-sm text-zinc-600 dark:text-zinc-400">KO Rate</dt>
                  <dd class="text-sm text-zinc-900 dark:text-white">{{ calculateKOPercentage(boxer) }}%</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-sm text-zinc-600 dark:text-zinc-400">Losses by KO</dt>
                  <dd class="text-sm text-zinc-900 dark:text-white">{{ boxer.pro_losses_by_knockout || 0 }}</dd>
                </div>
              </div>
              
              <!-- Amateur Career Stats (if available) -->
              <div v-if="boxer.amateur_total_bouts && boxer.amateur_total_bouts > 0" class="pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <div class="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Amateur Career</div>
                <div v-if="boxer.amateur_debut_date" class="flex justify-between mb-2">
                  <dt class="text-sm text-zinc-600 dark:text-zinc-400">Debut</dt>
                  <dd class="text-sm text-zinc-900 dark:text-white">{{ formatDate(boxer.amateur_debut_date) }}</dd>
                </div>
                <div class="flex justify-between mb-2">
                  <dt class="text-sm text-zinc-600 dark:text-zinc-400">Total Fights</dt>
                  <dd class="text-sm text-zinc-900 dark:text-white">{{ boxer.amateur_total_bouts }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-sm text-zinc-600 dark:text-zinc-400">Record</dt>
                  <dd class="text-sm text-zinc-900 dark:text-white">{{ boxer.amateur_wins }}-{{ boxer.amateur_losses }}-{{ boxer.amateur_draws }}</dd>
                </div>
              </div>
            </dl>
          </div>

          <!-- More in Division -->
          <div class="bg-white rounded-lg p-6 border border-zinc-200">
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
        
        <!-- Main Content -->
        <div class="lg:col-span-2 space-y-8">
          <!-- Professional Stats Grid -->
          <div>
            <h2 class="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Professional Record</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="bg-white rounded-lg p-4 border border-zinc-200">
                <div class="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Wins</div>
                <div class="text-2xl font-semibold text-zinc-900 dark:text-white">{{ boxer.pro_wins || boxer.record?.wins || 0 }}</div>
              </div>
              <div class="bg-white rounded-lg p-4 border border-zinc-200">
                <div class="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Losses</div>
                <div class="text-2xl font-semibold text-zinc-900 dark:text-white">{{ boxer.pro_losses || boxer.record?.losses || 0 }}</div>
              </div>
              <div class="bg-white rounded-lg p-4 border border-zinc-200">
                <div class="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Draws</div>
                <div class="text-2xl font-semibold text-zinc-900 dark:text-white">{{ boxer.pro_draws || boxer.record?.draws || 0 }}</div>
              </div>
              <div class="bg-white rounded-lg p-4 border border-zinc-200">
                <div class="text-sm text-zinc-600 dark:text-zinc-400 mb-1">KO Rate</div>
                <div class="text-2xl font-semibold text-zinc-900 dark:text-white">{{ calculateKOPercentage(boxer) }}%</div>
              </div>
            </div>
          </div>
          
          <!-- Amateur Stats Grid (if available) -->
          <div v-if="boxer.amateur_total_bouts && boxer.amateur_total_bouts > 0">
            <h2 class="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Amateur Record</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="bg-white rounded-lg p-4 border border-zinc-200">
                <div class="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Wins</div>
                <div class="text-2xl font-semibold text-zinc-900 dark:text-white">{{ boxer.amateur_wins }}</div>
              </div>
              <div class="bg-white rounded-lg p-4 border border-zinc-200">
                <div class="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Losses</div>
                <div class="text-2xl font-semibold text-zinc-900 dark:text-white">{{ boxer.amateur_losses }}</div>
              </div>
              <div class="bg-white rounded-lg p-4 border border-zinc-200">
                <div class="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Draws</div>
                <div class="text-2xl font-semibold text-zinc-900 dark:text-white">{{ boxer.amateur_draws }}</div>
              </div>
              <div class="bg-white rounded-lg p-4 border border-zinc-200">
                <div class="text-sm text-zinc-600 dark:text-zinc-400 mb-1">KOs</div>
                <div class="text-2xl font-semibold text-zinc-900 dark:text-white">{{ boxer.amateur_wins_by_knockout }}</div>
              </div>
            </div>
          </div>

          <!-- Biography -->
          <div v-if="boxer.bio || boxer.bioSections" class="space-y-8">
            <!-- Short Bio Summary -->
            <div v-if="boxer.bio">
              <h2 class="text-2xl font-bold text-zinc-900 dark:text-white mb-4">Biography</h2>
              <p class="text-zinc-700 dark:text-zinc-300 leading-relaxed text-lg">{{ boxer.bio }}</p>
            </div>
            
            <!-- Detailed Bio Sections -->
            <div v-if="boxer.bioSections" class="space-y-8">
              <div v-for="(section, key) in boxer.bioSections" :key="key" class="prose prose-zinc dark:prose-invert max-w-none">
                <h3 class="text-xl font-semibold text-zinc-900 dark:text-white mb-3">{{ section.title }}</h3>
                <div class="text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap" v-html="formatBioContent(section.content)"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Fight History - Full Width at Bottom -->
      <div class="mt-12">
        <h2 class="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Fight History</h2>
        <div class="h-[400px] overflow-auto" v-if="fights.length > 0">
          <UTable 
            :rows="fights" 
            :columns="columns"
            :sort="{ column: 'bout_date', direction: 'desc' }"
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
    </div>
  </div>
</template>

<style scoped>
/* Keep styles minimal and clean */
</style>