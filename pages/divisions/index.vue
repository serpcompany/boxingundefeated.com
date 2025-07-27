<script setup lang="ts">
import { mockDivisions } from '~/data/boxing-data'

useSeoMeta({
  title: 'Weight Divisions - Boxing Undefeated',
  description: 'Explore all professional boxing weight divisions from minimumweight to heavyweight. Learn about weight limits and division history.',
})

const divisions = computed(() => {
  return [...mockDivisions].sort((a, b) => b.order - a.order)
})

function formatWeightLimit(division: any) {
  return `${division.weightLimit.pounds} lbs / ${division.weightLimit.kilograms.toFixed(1)} kg`
}
</script>

<template>
  <div class="min-h-screen bg-zinc-50 dark:bg-zinc-900">
    <!-- Header -->
    <div class="bg-gradient-to-br from-red-600 to-red-800 text-white">
      <div class="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <h1 class="text-4xl font-bold mb-4">Boxing Weight Divisions</h1>
        <p class="text-xl text-red-100">
          From {{ divisions[divisions.length - 1].name }} to {{ divisions[0].name }}
        </p>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-6 lg:px-8 py-12">
      <!-- Introduction -->
      <div class="prose prose-zinc dark:prose-invert max-w-none mb-12">
        <p class="text-lg">
          Professional boxing recognizes 17 weight divisions, each with specific weight limits. 
          These divisions ensure fair competition by matching fighters of similar size and weight.
        </p>
      </div>

      <!-- Divisions Grid -->
      <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <UCard
          v-for="division in divisions"
          :key="division.id"
          class="hover:shadow-xl transition-all hover:-translate-y-1"
        >
          <template #header>
            <div class="flex justify-between items-center">
              <h2 class="text-xl font-bold text-zinc-900 dark:text-white">
                {{ division.name }}
              </h2>
              <UBadge color="red" variant="subtle">
                {{ division.order }}
              </UBadge>
            </div>
          </template>

          <div class="space-y-4">
            <!-- Weight Limit -->
            <div>
              <h3 class="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Weight Limit
              </h3>
              <p class="text-lg font-semibold text-zinc-900 dark:text-white">
                {{ formatWeightLimit(division) }}
              </p>
              <p v-if="division.weightLimit.stone" class="text-sm text-zinc-600 dark:text-zinc-400">
                {{ division.weightLimit.stone }}
              </p>
            </div>

            <!-- Alternative Names -->
            <div v-if="division.alternativeNames && division.alternativeNames.length > 0">
              <h3 class="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Also Known As
              </h3>
              <p class="text-sm text-zinc-600 dark:text-zinc-400">
                {{ division.alternativeNames.join(', ') }}
              </p>
            </div>

            <!-- Description -->
            <p v-if="division.description" class="text-sm text-zinc-600 dark:text-zinc-400">
              {{ division.description }}
            </p>

            <UButton
              :to="`/divisions/${division.slug}`"
              variant="soft"
              color="red"
              class="w-full"
              size="sm"
            >
              View {{ division.name }} Fighters
            </UButton>
          </div>
        </UCard>
      </div>

      <!-- Additional Info -->
      <div class="mt-16 bg-white dark:bg-zinc-800 rounded-lg p-8 shadow-sm">
        <h2 class="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
          Understanding Weight Divisions
        </h2>
        
        <div class="grid md:grid-cols-2 gap-8">
          <div>
            <h3 class="text-lg font-semibold text-zinc-900 dark:text-white mb-3">
              Traditional Eight Divisions
            </h3>
            <p class="text-zinc-600 dark:text-zinc-400 mb-4">
              The original eight weight divisions that formed the foundation of professional boxing:
            </p>
            <ul class="list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-1">
              <li>Heavyweight (unlimited)</li>
              <li>Light Heavyweight (175 lbs)</li>
              <li>Middleweight (160 lbs)</li>
              <li>Welterweight (147 lbs)</li>
              <li>Lightweight (135 lbs)</li>
              <li>Featherweight (126 lbs)</li>
              <li>Bantamweight (118 lbs)</li>
              <li>Flyweight (112 lbs)</li>
            </ul>
          </div>
          
          <div>
            <h3 class="text-lg font-semibold text-zinc-900 dark:text-white mb-3">
              Weight Class Rules
            </h3>
            <p class="text-zinc-600 dark:text-zinc-400 mb-4">
              Key regulations for weight divisions in professional boxing:
            </p>
            <ul class="list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-1">
              <li>Fighters must not exceed the division's weight limit</li>
              <li>Official weigh-ins typically occur 24-36 hours before the fight</li>
              <li>Fighters can compete in multiple divisions throughout their career</li>
              <li>Championship belts are specific to each weight division</li>
              <li>Catch-weight bouts can be arranged between divisions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>