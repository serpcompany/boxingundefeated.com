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
    <PageHero 
      title="Boxing Weight Divisions"
      :subtitle="`From ${divisions[divisions.length - 1].name} to ${divisions[0].name}`"
    />

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-6 lg:px-8 py-12">
      <!-- Introduction -->
      <div class="prose prose-zinc dark:prose-invert max-w-none mb-12">
        <p class="text-lg">
          Professional boxing recognizes 17 weight divisions, each with specific weight limits. 
          These divisions ensure fair competition by matching fighters of similar size and weight.
        </p>
      </div>

      <!-- Divisions Table -->
      <div class="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
            <thead class="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Division
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Weight Limit
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden md:table-cell">
                  Alternative Names
                </th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-700">
              <tr 
                v-for="division in divisions" 
                :key="division.id"
                class="hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                @click="$router.push(`/divisions/${division.slug}`)"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div>
                      <div class="text-sm font-medium text-zinc-900 dark:text-white">
                        {{ division.name }}
                      </div>
                      <div class="text-xs text-zinc-500 dark:text-zinc-400">
                        {{ division.order === 1 ? 'Heaviest' : division.order === 17 ? 'Lightest' : '' }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div v-if="division.slug === 'heavyweight'" class="text-base font-semibold text-zinc-900 dark:text-white">
                    No limit
                  </div>
                  <div v-else>
                    <div class="text-base font-semibold text-zinc-900 dark:text-white">
                      {{ division.weightLimit.pounds }} lbs
                    </div>
                    <div class="text-sm text-zinc-500 dark:text-zinc-400">
                      {{ division.weightLimit.kilograms.toFixed(1) }} kg
                      <span v-if="division.weightLimit.stone"> / {{ division.weightLimit.stone }}</span>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400 hidden md:table-cell">
                  <span v-if="division.alternativeNames && division.alternativeNames.length > 0">
                    {{ division.alternativeNames.join(', ') }}
                  </span>
                  <span v-else class="text-zinc-400 dark:text-zinc-600">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
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