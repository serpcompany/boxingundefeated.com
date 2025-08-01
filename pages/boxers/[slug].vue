<script setup lang="ts">
import type { Boxer } from '~/types'

const route = useRoute()
const slug = route.params.slug as string

// Use useAsyncData for proper SSR and hydration with API
const { data: boxerResponse, pending, error } = await useAsyncData(
  `boxer-${slug}`,
  () => $fetch(`/api/boxers/${slug}`)
)

// Extract boxer from API response
const boxer = computed(() => boxerResponse.value?.boxer)

const divisionSlug = computed(() => {
  if (!boxer.value) return ''
  return boxer.value.pro_division || boxer.value.division || ''
})

const { data: divisions } = useFetch('/api/divisions')

const division = computed(() => {
  if (!divisionSlug.value || !divisions.value) return null
  // Normalize the division slug to match divisions format
  const normalized = divisionSlug.value.toLowerCase().replace(/\s+/g, '-')
  return divisions.value.divisions.find(d => d.slug === normalized)
})

const { site } = useAppConfig()

useSeoMeta({
  title: computed(() => {
    if (!boxer.value) return 'Boxer Profile'
    const nickname = boxer.value.nickname ? ` "${boxer.value.nickname}"` : ''
    return `${boxer.value.name}${nickname}`
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


// Use fights from API response
const fights = computed(() => {
  if (!boxerResponse.value?.fights) return []
  return boxerResponse.value.fights
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
    <BoxerSkeleton v-else-if="pending" />

    <!-- Boxer Content -->
    <div v-else-if="boxer" class="min-h-screen bg-white">
    
    <!-- Breadcrumbs -->
    <div class="bg-white border-b border-gray-100">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
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
    <div class="max-w-6xl mx-auto px-6 lg:px-8 py-8 sm:py-12">
      <div class="space-y-8">
        <!-- Combined Record Stats -->
        <BoxerRecordTabs :boxer="boxer" />

        <!-- Fighter Information Card -->
        <FighterInfoCard :boxer="boxer" />
        
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