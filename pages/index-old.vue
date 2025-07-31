<script setup lang="ts">
import { mockBoxers, mockDivisions } from '~/data/boxing-data'

const { site } = useAppConfig()

const title = site.tagline
const description = site.description

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: `${site.url}/og-image-home.jpg`,
  ogUrl: site.url,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: `${site.url}/og-image-home.jpg`,
})

// Schema.org structured data using useHead
useHead({
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': `${site.url}/#website`,
            url: site.url,
            name: site.name,
            description: site.description,
            inLanguage: site.defaultLocale,
          },
          {
            '@type': 'Organization',
            '@id': `${site.url}/#organization`,
            name: site.name,
            url: site.url,
            description: site.description,
            logo: `${site.url}/logo.png`,
          },
        ],
      }),
    },
  ],
})

const allBoxers = computed(() => mockBoxers)
</script>

<template>
  <div class="min-h-screen bg-zinc-50 dark:bg-zinc-900">
    <!-- Hero Section -->
    <section class="relative overflow-hidden bg-red-600 text-white min-h-[350px] flex items-center">
      <div class="relative w-full max-w-7xl mx-auto px-6 lg:px-8 py-24 sm:py-32">
        <div class="text-center">
          <h1 class="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
            Boxing Undefeated
          </h1>
          <p class="text-xl sm:text-2xl max-w-3xl mx-auto mb-8 text-red-100">
            Your comprehensive guide to the sweet science. Explore fighter profiles, 
            weight divisions, and boxing history.
          </p>
          <div class="flex gap-4 justify-center">
            <UButton 
              to="/boxers" 
              size="lg"
              color="white"
              variant="solid"
            >
              Browse Fighters
            </UButton>
            <UButton 
              to="/divisions" 
              size="lg"
              color="white"
              variant="outline"
            >
              Weight Divisions
            </UButton>
          </div>
        </div>
      </div>
    </section>

    <!-- Featured Boxers -->
    <section class="py-16 sm:py-24">
      <div class="max-w-7xl mx-auto px-6 lg:px-8">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-zinc-900 dark:text-white mb-4">
            Featured Fighters
          </h2>
          <p class="text-lg text-zinc-600 dark:text-zinc-400">
            Legends and champions from the boxing world
          </p>
        </div>
        
        <BoxersTable :boxers="featuredBoxers" />

        <div class="text-center mt-12">
          <UButton to="/boxers" variant="outline" size="lg">
            View All Fighters
          </UButton>
        </div>
      </div>
    </section>

    <!-- Weight Divisions -->
    <section class="py-16 sm:py-24 bg-white dark:bg-zinc-800">
      <div class="max-w-7xl mx-auto px-6 lg:px-8">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-zinc-900 dark:text-white mb-4">
            Weight Divisions
          </h2>
          <p class="text-lg text-zinc-600 dark:text-zinc-400">
            From minimumweight to heavyweight
          </p>
        </div>

        <DivisionsTable :divisions="divisions" compact />

        <div class="text-center mt-12">
          <UButton to="/divisions" variant="outline" size="lg">
            View All Divisions
          </UButton>
        </div>
      </div>
    </section>
    
  </div>
</template>