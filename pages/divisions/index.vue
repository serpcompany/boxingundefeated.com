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
  <div class="min-h-screen bg-white">
    <!-- Breadcrumbs -->
    <div class="bg-white border-b border-gray-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <BreadCrumbs 
          :items="[
            { label: 'Divisions' }
          ]"
        />
      </div>
    </div>
    
    <!-- Header -->
    <PageHero 
      title="Boxing Weight Divisions"
    />

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-6 lg:px-8 py-12">

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
                  <div class="text-base font-semibold text-zinc-900 dark:text-white">
                    {{ division.name }}
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

    </div>
  </div>
</template>