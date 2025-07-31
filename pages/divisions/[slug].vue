<script setup lang="ts">
import type { Division, Boxer } from '~/types/Boxing'
import { mockDivisions, mockBoxers } from '~/data/boxing-data'

const route = useRoute()
const slug = route.params.slug as string

const division = computed(() => mockDivisions.find(d => d.slug === slug))
const boxersInDivision = computed(() => mockBoxers.filter(b => b.division === slug))

if (!division.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Division not found',
  })
}

const { site } = useAppConfig()

useSeoMeta({
  title: division.value.name,
  description: `${division.value.name} Boxing Division - Champions, Contenders & More!`,
})

const activeBoxers = computed(() => boxersInDivision.value.filter(b => b.active))
const retiredBoxers = computed(() => boxersInDivision.value.filter(b => !b.active))
const champions = computed(() => boxersInDivision.value.filter(b => b.titles && b.titles.length > 0))

function formatWeightLimit(division: Division) {
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
            { label: 'Divisions', to: '/divisions' },
            { label: division.name }
          ]"
        />
      </div>
    </div>
    
    <!-- Header -->
    <PageHero 
      :title="division.name"
    >
      <template #after>
        <div class="mt-4 space-y-2">
          <p class="text-lg text-zinc-600 dark:text-zinc-400">
            Weight Limit: {{ formatWeightLimit(division) }}
            <span v-if="division.weightLimit.stone" class="text-base">
              ({{ division.weightLimit.stone }})
            </span>
          </p>
          <p v-if="division.alternativeNames && division.alternativeNames.length > 0" class="text-zinc-500 dark:text-zinc-500">
            Also known as: {{ division.alternativeNames.join(', ') }}
          </p>
        </div>
      </template>
    </PageHero>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-6 lg:px-8 py-12">
      <!-- Division Info -->
      <div v-if="division.description" class="mb-12">
        <p class="text-lg text-zinc-600 dark:text-zinc-400">
          {{ division.description }}
        </p>
      </div>


      <!-- All Fighters -->
      <div>
        <h2 class="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
          {{ division.name }} Fighters
        </h2>
        
        <div v-if="boxersInDivision.length === 0" class="text-center py-12">
          <UIcon name="i-heroicons-users" class="w-12 h-12 text-zinc-400 mx-auto mb-4" />
          <p class="text-zinc-600 dark:text-zinc-400">
            No fighters currently listed in this division.
          </p>
        </div>

        <BoxersTable v-else :boxers="boxersInDivision" />
      </div>

      <!-- Back Navigation -->
      <div class="mt-12 text-center">
        <UButton to="/divisions" variant="outline" size="lg">
          ← Back to All Divisions
        </UButton>
      </div>
    </div>
  </div>
</template>