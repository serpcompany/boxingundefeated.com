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

useSeoMeta({
  title: `${division.value.name} - Boxing Undefeated`,
  description: `Explore ${division.value.name} boxers and champions. Weight limit: ${division.value.weightLimit.pounds} lbs.`,
})

const activeBoxers = computed(() => boxersInDivision.value.filter(b => b.active))
const retiredBoxers = computed(() => boxersInDivision.value.filter(b => !b.active))
const champions = computed(() => boxersInDivision.value.filter(b => b.titles && b.titles.length > 0))

function formatWeightLimit(division: Division) {
  return `${division.weightLimit.pounds} lbs / ${division.weightLimit.kilograms.toFixed(1)} kg`
}
</script>

<template>
  <div class="min-h-screen bg-zinc-50 dark:bg-zinc-900">
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

      <!-- Quick Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
        <UCard>
          <div class="text-center">
            <div class="text-3xl font-bold text-zinc-900 dark:text-white">
              {{ boxersInDivision.length }}
            </div>
            <div class="text-sm text-zinc-600 dark:text-zinc-400">Total Fighters</div>
          </div>
        </UCard>
        
        <UCard>
          <div class="text-center">
            <div class="text-3xl font-bold text-green-600">
              {{ activeBoxers.length }}
            </div>
            <div class="text-sm text-zinc-600 dark:text-zinc-400">Active</div>
          </div>
        </UCard>
        
        <UCard>
          <div class="text-center">
            <div class="text-3xl font-bold text-gray-600">
              {{ retiredBoxers.length }}
            </div>
            <div class="text-sm text-zinc-600 dark:text-zinc-400">Retired</div>
          </div>
        </UCard>
        
        <UCard>
          <div class="text-center">
            <div class="text-3xl font-bold text-amber-600">
              {{ champions.length }}
            </div>
            <div class="text-sm text-zinc-600 dark:text-zinc-400">Champions</div>
          </div>
        </UCard>
      </div>

      <!-- Champions Section -->
      <div v-if="champions.length > 0" class="mb-12">
        <h2 class="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
          Current Champions
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NuxtLink
            v-for="boxer in champions"
            :key="boxer.id"
            :to="`/boxers/${boxer.slug}`"
            class="block"
          >
            <UCard class="h-full hover:shadow-xl transition-all hover:-translate-y-1">
              <div class="flex flex-col h-full">
                <!-- Image -->
                <div class="aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden mb-4">
                  <img
                    v-if="boxer.image"
                    :src="boxer.image"
                    :alt="boxer.name"
                    class="w-full h-full object-cover"
                  >
                  <div v-else class="w-full h-full flex items-center justify-center">
                    <UIcon name="i-heroicons-user" class="w-16 h-16 text-zinc-400" />
                  </div>
                </div>

                <!-- Content -->
                <div class="flex-1 space-y-3">
                  <div>
                    <h3 class="text-lg font-semibold text-zinc-900 dark:text-white">
                      {{ boxer.name }}
                    </h3>
                    <p v-if="boxer.nickname" class="text-sm text-zinc-600 dark:text-zinc-400">
                      "{{ boxer.nickname }}"
                    </p>
                  </div>

                  <div class="flex flex-wrap gap-2">
                    <UBadge
                      v-for="title in boxer.titles"
                      :key="title"
                      color="amber"
                      variant="solid"
                      size="xs"
                    >
                      {{ title }}
                    </UBadge>
                  </div>

                  <div class="pt-3 mt-auto border-t border-zinc-200 dark:border-zinc-700">
                    <p class="text-sm text-zinc-600 dark:text-zinc-400">
                      Record: <span class="font-medium text-zinc-900 dark:text-white">{{ boxer.record.wins }}-{{ boxer.record.losses }}-{{ boxer.record.draws }}</span>
                      <span class="text-zinc-500"> ({{ boxer.record.knockouts }} KOs)</span>
                    </p>
                  </div>
                </div>
              </div>
            </UCard>
          </NuxtLink>
        </div>
      </div>

      <!-- All Fighters -->
      <div>
        <h2 class="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
          All {{ division.name }} Fighters
        </h2>
        
        <div v-if="boxersInDivision.length === 0" class="text-center py-12">
          <UIcon name="i-heroicons-users" class="w-12 h-12 text-zinc-400 mx-auto mb-4" />
          <p class="text-zinc-600 dark:text-zinc-400">
            No fighters currently listed in this division.
          </p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <NuxtLink
            v-for="boxer in boxersInDivision"
            :key="boxer.id"
            :to="`/boxers/${boxer.slug}`"
            class="group"
          >
            <UCard class="hover:shadow-lg transition-all hover:-translate-y-1">
              <div class="flex items-center space-x-3">
                <div class="flex-shrink-0">
                  <div class="w-12 h-12 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <img
                      v-if="boxer.image"
                      :src="boxer.image"
                      :alt="boxer.name"
                      class="w-full h-full object-cover"
                    >
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-zinc-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 truncate">
                    {{ boxer.name }}
                  </p>
                  <p class="text-sm text-zinc-500 dark:text-zinc-400">
                    {{ boxer.record.wins }}-{{ boxer.record.losses }}-{{ boxer.record.draws }}
                  </p>
                </div>
                <div>
                  <UBadge v-if="boxer.active" color="green" variant="subtle" size="xs">
                    Active
                  </UBadge>
                  <UBadge v-else color="gray" variant="subtle" size="xs">
                    Retired
                  </UBadge>
                </div>
              </div>
            </UCard>
          </NuxtLink>
        </div>
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