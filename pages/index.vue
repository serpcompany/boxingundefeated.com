<script setup lang="ts">
import { mockBoxers, mockDivisions } from '~/data/boxing-data'

useSeoMeta({
  title: 'Boxing Undefeated - Your Ultimate Boxing Resource',
  description: 'Explore fighter profiles, weight divisions, fight records, and the latest boxing news. Your comprehensive guide to the sweet science.',
})

const featuredBoxers = computed(() => mockBoxers.slice(0, 3))
const divisions = computed(() => mockDivisions.slice(0, 8))
</script>

<template>
  <div class="min-h-screen bg-zinc-50 dark:bg-zinc-900">
    <!-- Hero Section -->
    <section class="relative overflow-hidden bg-gradient-to-br from-red-600 to-red-800 text-white">
      <div class="absolute inset-0 bg-black/20" />
      <div class="relative max-w-7xl mx-auto px-6 lg:px-8 py-24 sm:py-32">
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
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <UCard 
            v-for="boxer in featuredBoxers" 
            :key="boxer.id"
            class="hover:shadow-xl transition-shadow"
          >
            <template #header>
              <div class="aspect-w-16 aspect-h-9 bg-zinc-200 dark:bg-zinc-700 rounded-lg overflow-hidden">
                <img 
                  v-if="boxer.image" 
                  :src="boxer.image" 
                  :alt="boxer.name"
                  class="w-full h-48 object-cover"
                >
              </div>
            </template>

            <div class="space-y-3">
              <div>
                <h3 class="text-xl font-semibold text-zinc-900 dark:text-white">
                  {{ boxer.name }}
                </h3>
                <p v-if="boxer.nickname" class="text-zinc-600 dark:text-zinc-400">
                  "{{ boxer.nickname }}"
                </p>
              </div>

              <div class="flex items-center gap-4 text-sm">
                <UBadge v-if="boxer.active" color="green" variant="subtle">
                  Active
                </UBadge>
                <UBadge v-else color="gray" variant="subtle">
                  Retired
                </UBadge>
                <span class="text-zinc-600 dark:text-zinc-400">
                  {{ boxer.division.replace('-', ' ') }}
                </span>
              </div>

              <div class="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                <p class="text-sm font-medium text-zinc-900 dark:text-white">
                  Record: {{ boxer.record.wins }}-{{ boxer.record.losses }}-{{ boxer.record.draws }}
                  ({{ boxer.record.knockouts }} KOs)
                </p>
              </div>

              <UButton 
                :to="`/boxers/${boxer.slug}`" 
                variant="soft" 
                color="red"
                class="w-full"
              >
                View Profile
              </UButton>
            </div>
          </UCard>
        </div>

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

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <NuxtLink
            v-for="division in divisions"
            :key="division.id"
            :to="`/divisions/${division.slug}`"
            class="group"
          >
            <UCard class="hover:shadow-lg transition-all hover:-translate-y-1">
              <div class="text-center">
                <h3 class="font-semibold text-zinc-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400">
                  {{ division.name }}
                </h3>
                <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  {{ division.weightLimit.pounds }} lbs
                </p>
              </div>
            </UCard>
          </NuxtLink>
        </div>

        <div class="text-center mt-12">
          <UButton to="/divisions" variant="outline" size="lg">
            View All Divisions
          </UButton>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-16 sm:py-24">
      <div class="max-w-7xl mx-auto px-6 lg:px-8">
        <UCard class="bg-gradient-to-r from-red-600 to-red-700 border-0">
          <div class="text-center py-8">
            <h2 class="text-3xl font-bold text-white mb-4">
              Stay Updated with Boxing News
            </h2>
            <p class="text-xl text-red-100 mb-8 max-w-2xl mx-auto">
              Get the latest updates on fights, rankings, and boxing events delivered to your inbox.
            </p>
            <div class="flex gap-4 justify-center">
              <UButton color="white" size="lg">
                Subscribe Now
              </UButton>
              <UButton color="white" variant="outline" size="lg" to="/about">
                Learn More
              </UButton>
            </div>
          </div>
        </UCard>
      </div>
    </section>
  </div>
</template>