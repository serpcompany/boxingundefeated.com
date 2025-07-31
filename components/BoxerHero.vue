<script setup lang="ts">
import type { Boxer } from '~/types/Boxing'

interface Props {
  boxer: Boxer
}

const props = defineProps<Props>()

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

function getDivisionSlug(boxer: Boxer): string {
  const division = getDivision(boxer)
  if (!division) return ''
  // Convert division name to slug format
  return division.toLowerCase().replace(/\s+/g, '-')
}
</script>

<template>
  <div class="bg-white border-b border-zinc-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16 w-full">
      <!-- Mobile Layout (Stacked) -->
      <div class="sm:hidden">
        <!-- Centered Image -->
        <div v-if="getImageUrl(boxer)" class="flex justify-center mb-6">
          <img
            :src="getImageUrl(boxer)"
            :alt="getDisplayName(boxer)"
            class="w-32 h-32 rounded-full object-cover shadow-lg"
          >
        </div>
        
        <!-- Centered Info -->
        <div class="text-center">
          <h1 class="text-2xl font-bold mb-3 text-zinc-900 dark:text-white">
            {{ getDisplayName(boxer) }}
          </h1>
          <p v-if="boxer.nickname" class="text-lg text-zinc-600 dark:text-zinc-400 mb-4">
            "{{ boxer.nickname }}"
          </p>
          
          <div class="flex flex-wrap justify-center items-center gap-2">
            <!-- Division Badge -->
            <NuxtLink 
              v-if="getDivision(boxer)"
              :to="`/divisions/${getDivisionSlug(boxer)}`"
            >
              <UBadge 
                color="primary"
                variant="soft"
                size="sm"
                class="hover:shadow-md transition-shadow cursor-pointer"
              >
                {{ getDivision(boxer) }}
              </UBadge>
            </NuxtLink>
            
            <!-- Nationality Badge -->
            <UBadge 
              v-if="boxer.nationality"
              color="neutral"
              variant="subtle"
              size="sm"
            >
              {{ boxer.nationality }}
            </UBadge>
            
            <!-- Status Badge -->
            <UBadge 
              :color="isActive(boxer) ? 'success' : 'neutral'"
              :variant="isActive(boxer) ? 'soft' : 'subtle'"
              size="sm"
            >
              {{ getStatus(boxer) }}
            </UBadge>
          </div>
        </div>
      </div>
      
      <!-- Desktop Layout (Side by Side) -->
      <div class="hidden sm:flex items-start gap-6 md:gap-8">
        <!-- Image on the left -->
        <div v-if="getImageUrl(boxer)" class="flex-shrink-0">
          <img
            :src="getImageUrl(boxer)"
            :alt="getDisplayName(boxer)"
            class="w-36 h-36 md:w-48 md:h-48 rounded-full object-cover shadow-lg"
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
          
          <div class="flex flex-wrap items-center gap-3 md:gap-4">
            <!-- Division Badge -->
            <NuxtLink 
              v-if="getDivision(boxer)"
              :to="`/divisions/${getDivisionSlug(boxer)}`"
            >
              <UBadge 
                color="primary"
                variant="soft"
                size="md"
                class="hover:shadow-md transition-shadow cursor-pointer"
              >
                {{ getDivision(boxer) }}
              </UBadge>
            </NuxtLink>
            
            <!-- Nationality Badge -->
            <UBadge 
              v-if="boxer.nationality"
              color="neutral"
              variant="subtle"
              size="md"
            >
              {{ boxer.nationality }}
            </UBadge>
            
            <!-- Status Badge -->
            <UBadge 
              :color="isActive(boxer) ? 'success' : 'neutral'"
              :variant="isActive(boxer) ? 'soft' : 'subtle'"
              size="md"
            >
              {{ getStatus(boxer) }}
            </UBadge>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>