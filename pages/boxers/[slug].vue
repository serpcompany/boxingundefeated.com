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

const { site } = useAppConfig()

useSeoMeta({
  title: computed(() => {
    if (!boxer.value) return site.name
    const nickname = boxer.value.nickname ? ` "${boxer.value.nickname}"` : ''
    return `${boxer.value.name}${nickname} - ${site.name}`
  }),
  description: computed(() => {
    if (!boxer.value) return site.description
    return `${boxer.value.name} Bio, Record, Fights, News & More!`
  }),
})

// Schema.org structured data for boxer profile
useHead({
  script: [
    {
      type: 'application/ld+json',
      children: computed(() => {
        if (!boxer.value) return '{}'
        
        const wins = boxer.value.pro_wins || boxer.value.record?.wins || 0
        const losses = boxer.value.pro_losses || boxer.value.record?.losses || 0
        const draws = boxer.value.pro_draws || boxer.value.record?.draws || 0
        
        return JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Person',
          '@id': `${site.url}/boxers/${slug}/#person`,
          name: boxer.value.name,
          alternateName: boxer.value.nickname,
          url: `${site.url}/boxers/${slug}`,
          nationality: boxer.value.nationality,
          birthDate: boxer.value.date_of_birth,
          jobTitle: 'Professional Boxer',
          sport: 'Boxing',
          description: `${boxer.value.name} Bio, Record, Fights, News & More!`,
          image: boxer.value.image,
          additionalProperty: [
            {
              '@type': 'PropertyValue',
              name: 'Professional Record',
              value: `${wins}-${losses}-${draws}`,
            },
            {
              '@type': 'PropertyValue', 
              name: 'Weight Division',
              value: division.value?.name || 'Professional',
            },
            {
              '@type': 'PropertyValue',
              name: 'Status',
              value: boxer.value.active ? 'Active' : 'Retired',
            },
          ],
        })
      }),
    },
  ],
})


function calculateKOPercentage(boxer: Boxer): string {
  const wins = boxer.pro_wins || boxer.record?.wins || 0
  const kos = boxer.pro_wins_by_knockout || boxer.record?.knockouts || 0
  if (wins === 0) return '0'
  return ((kos / wins) * 100).toFixed(1)
}

// Computed values for stats grids
const professionalStats = computed(() => {
  if (!boxer.value) return []
  return [
    { label: 'Wins', value: boxer.value.pro_wins || boxer.value.record?.wins || 0 },
    { label: 'Losses', value: boxer.value.pro_losses || boxer.value.record?.losses || 0 },
    { label: 'Draws', value: boxer.value.pro_draws || boxer.value.record?.draws || 0 },
    { label: 'KO Rate', value: `${calculateKOPercentage(boxer.value)}%` }
  ]
})

const amateurStats = computed(() => {
  if (!boxer.value) return []
  return [
    { label: 'Wins', value: boxer.value.amateur_wins },
    { label: 'Losses', value: boxer.value.amateur_losses },
    { label: 'Draws', value: boxer.value.amateur_draws },
    { label: 'KOs', value: boxer.value.amateur_wins_by_knockout }
  ]
})

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
</script>

<template>
  <div>
    <!-- Error State -->
    <ErrorState
      v-if="error"
      title="Boxer Not Found"
      :message="`The boxer &quot;${slug}&quot; could not be found.`"
      link-text="← Back to Boxers"
      link-to="/boxers"
    />

    <!-- Loading State -->
    <LoadingState
      v-else-if="pending"
      message="Loading boxer details..."
    />

    <!-- Boxer Content -->
    <div v-else-if="boxer" class="min-h-screen bg-white">
    
    <!-- Breadcrumbs -->
    <div class="bg-white border-b border-gray-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <BreadCrumbs 
          :items="[
            { label: 'Boxers', to: '/boxers' },
            { label: boxer.full_name || boxer.name || '' }
          ]"
        />
      </div>
    </div>
    
    <!-- Hero Section -->
    <BoxerHero :boxer="boxer" />
    
    <!-- Sticky Horizontal TOC -->
    <BoxerPageTOCHorizontal :boxer="boxer" />

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-6 lg:px-8 py-8 sm:py-12">
      <div class="space-y-8">
        <!-- Professional Stats Grid -->
        <StatsGrid 
          title="Professional Record" 
          :stats="professionalStats" 
        />
        
        <!-- Amateur Stats Grid (if available) -->
        <StatsGrid 
          v-if="boxer.amateur_total_bouts && boxer.amateur_total_bouts > 0"
          title="Amateur Record" 
          :stats="amateurStats" 
        />

        <!-- Fighter Information Card -->
        <FighterInfoCard :boxer="boxer" />

        <!-- More in Division -->
        <div class="rounded-lg p-6 border border-zinc-200">
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
        
        <!-- Biography Section -->
        <BiographySection :boxer="boxer" />
        
        <!-- Fight History Table -->
        <FightHistoryTable :fights="fights" />
      </div>
    </div>
    </div>
  </div>
</template>

<style scoped>
/* Keep styles minimal and clean */
</style>