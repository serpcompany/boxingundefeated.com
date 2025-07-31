<script setup lang="ts">
import type { Boxer } from '~/types/Boxing'

interface Props {
  boxer: Boxer
}

const props = defineProps<Props>()

function formatRecord(boxer: Boxer): string {
  if (boxer.pro_wins !== undefined) {
    return `${boxer.pro_wins}-${boxer.pro_losses}-${boxer.pro_draws}`
  }
  return `${boxer.record?.wins || 0}-${boxer.record?.losses || 0}-${boxer.record?.draws || 0}`
}

function getKnockouts(boxer: Boxer): number {
  return boxer.pro_wins_by_knockout || boxer.record?.knockouts || 0
}

function getDivision(boxer: Boxer): string | undefined {
  return boxer.pro_division || boxer.division
}

function isActive(boxer: Boxer): boolean {
  return boxer.pro_status === 'active' || boxer.active || false
}

function getStatus(boxer: Boxer): string {
  if (isActive(boxer)) return 'Active'
  return boxer.pro_status || 'Retired'
}

function getDisplayName(boxer: Boxer): string {
  return boxer.full_name || boxer.name || ''
}

function getImageUrl(boxer: Boxer): string | undefined {
  return boxer.image_url || boxer.image
}
</script>

<template>
  <div class="bg-white min-h-[350px] flex items-center">
    <div class="max-w-7xl mx-auto px-6 lg:px-8 py-24 w-full">
      <!-- Breadcrumb -->
      <BreadCrumbs 
        :items="[
          { label: 'Boxers', to: '/boxers' },
          { label: getDisplayName(boxer) }
        ]"
        class="mb-6"
      />

      <div class="flex items-start gap-8">
        <!-- Image on the left -->
        <div v-if="getImageUrl(boxer)" class="flex-shrink-0">
          <img
            :src="getImageUrl(boxer)"
            :alt="getDisplayName(boxer)"
            class="w-32 h-32 md:w-40 md:h-40 rounded-lg object-cover shadow-lg"
          >
        </div>
        
        <!-- Main Info -->
        <div class="flex-1">
          <h1 class="text-3xl md:text-4xl font-bold mb-4 text-zinc-900 dark:text-white">
            {{ getDisplayName(boxer) }}
            <span v-if="boxer.nickname" class="text-zinc-600 dark:text-zinc-400 font-normal">
              "{{ boxer.nickname }}"
            </span>
          </h1>
          
          <div class="flex flex-wrap items-center gap-4 md:gap-6 text-base md:text-lg">
            <span class="text-zinc-700 dark:text-zinc-300">
              {{ formatRecord(boxer) }} ({{ getKnockouts(boxer) }} KOs)
            </span>
            <span v-if="getDivision(boxer)" class="text-zinc-700 dark:text-zinc-300">
              {{ getDivision(boxer) }}
            </span>
            <span v-if="boxer.nationality" class="text-zinc-700 dark:text-zinc-300">
              {{ boxer.nationality }}
            </span>
            <span 
              :class="isActive(boxer) ? 'text-green-600 dark:text-green-400' : 'text-zinc-600 dark:text-zinc-400'"
            >
              {{ getStatus(boxer) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>