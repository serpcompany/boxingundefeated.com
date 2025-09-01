<script setup lang="ts">
import type { Boxer } from '~/types'

interface Props {
  boxer: Boxer
}

const props = defineProps<Props>()

function getDivision(boxer: Boxer): string | undefined {
  return boxer.proDivision
}

function isActive(boxer: Boxer): boolean {
  return boxer.proStatus !== 'inactive'
}

function getStatus(boxer: Boxer): string {
  if (isActive(boxer)) return 'Active'
  return boxer.proStatus || 'Retired'
}

function getDisplayName(boxer: Boxer): string {
  return boxer.name || ''
}

function getImageUrl(boxer: Boxer): string | undefined {
  return boxer.avatarImage || undefined
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
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16 w-full">
      <!-- Mobile Layout (Stacked) -->
      <div class="sm:hidden">
        <!-- Centered Image -->
        <div v-if="getImageUrl(boxer)" class="flex justify-center mb-6">
          <img
            :src="getImageUrl(boxer)"
            :alt="getDisplayName(boxer)"
            class="w-32 h-32 rounded-full object-cover"
          >
        </div>
        
        <!-- Centered Info -->
        <div class="text-center">
          <h1 class="text-2xl font-bold mb-3 text-zinc-900">
            {{ getDisplayName(boxer) }}
          </h1>
          <p v-if="boxer.nicknames" class="text-lg text-zinc-600 mb-4">
            "{{ boxer.nicknames }}"
          </p>
          
          <div class="flex flex-wrap justify-center items-center gap-2">
            <!-- Division Badge -->
            <DivisionBadge 
              v-if="getDivision(boxer)"
              :division="getDivision(boxer)"
            />
            
            <!-- Nationality Badge -->
            <UBadge 
              v-if="boxer.nationality"
              color="gray"
              variant="soft"
              size="sm"
            >
              {{ boxer.nationality }}
            </UBadge>
            
            <!-- Status Badge -->
            <StatusBadge :active="isActive(boxer)" />
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
            class="w-36 h-36 md:w-48 md:h-48 rounded-full object-cover"
          >
        </div>
        
        <!-- Main Info -->
        <div class="flex-1">
          <h1 class="text-3xl md:text-4xl font-bold mb-4 text-zinc-900">
            {{ getDisplayName(boxer) }}
            <span v-if="boxer.nicknames" class="text-zinc-600 font-normal">
              "{{ boxer.nicknames }}"
            </span>
          </h1>
          
          <div class="flex flex-wrap items-center gap-3 md:gap-4">
            <!-- Division Badge -->
            <DivisionBadge 
              v-if="getDivision(boxer)"
              :division="getDivision(boxer)"
              size="md"
            />
            
            <!-- Nationality Badge -->
            <UBadge 
              v-if="boxer.nationality"
              color="gray"
              variant="soft"
              size="md"
            >
              {{ boxer.nationality }}
            </UBadge>
            
            <!-- Status Badge -->
            <StatusBadge :active="isActive(boxer)" size="md" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>