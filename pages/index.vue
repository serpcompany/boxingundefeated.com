<script setup lang="ts">
import { mockBoxers } from '~/data/boxing-data'

const { site } = useAppConfig()

useSeoMeta({
  title: site.tagline,
  description: site.description,
  ogTitle: site.tagline,
  ogDescription: site.description,
  ogImage: `${site.url}/og-image-home.jpg`,
  ogUrl: site.url,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: site.tagline,
  twitterDescription: site.description,
  twitterImage: `${site.url}/og-image-home.jpg`,
})
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-zinc-900">
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

    <!-- All Boxers Table -->
    <section class="py-16 sm:py-24">
      <div class="max-w-7xl mx-auto px-6 lg:px-8">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-zinc-900 dark:text-white mb-4">
            All Fighters
          </h2>
          <p class="text-lg text-zinc-600 dark:text-zinc-400">
            Browse our complete database of professional boxers
          </p>
        </div>
        
        <BoxersTable :boxers="mockBoxers" />
      </div>
    </section>
  </div>
</template>