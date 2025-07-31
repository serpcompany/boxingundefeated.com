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
            class="w-40 h-40 md:w-48 md:h-48 rounded-full object-cover shadow-lg"
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