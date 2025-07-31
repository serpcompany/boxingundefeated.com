<script setup lang="ts">
import type { Boxer } from '~/types/Boxing'

interface Props {
  boxer: Boxer
}

const props = defineProps<Props>()

function formatDate(date: string | null | undefined): string {
  if (!date) return 'N/A'
  try {
    const d = new Date(date)
    const month = d.getMonth() + 1
    const day = d.getDate()
    const year = d.getFullYear()
    return `${month}/${day}/${year}`
  } catch {
    return 'N/A'
  }
}

function calculateAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

function formatHeight(height: string | null | undefined): string {
  return height || 'N/A'
}

function formatReach(reach: string | null | undefined): string {
  return reach || 'N/A'
}

function getTotalFights(boxer: Boxer): number {
  if (boxer.pro_total_bouts !== undefined) {
    return boxer.pro_total_bouts
  }
  return (boxer.record?.wins || 0) + (boxer.record?.losses || 0) + (boxer.record?.draws || 0)
}

function calculateKOPercentage(boxer: Boxer): string {
  const wins = boxer.pro_wins || boxer.record?.wins || 0
  const kos = boxer.pro_wins_by_knockout || boxer.record?.knockouts || 0
  if (wins === 0) return '0'
  return ((kos / wins) * 100).toFixed(1)
}
</script>

<template>
  <div id="fighter-information" class="bg-white rounded-lg p-6 border border-zinc-200">
    <h3 class="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Fighter Information</h3>
    <dl class="space-y-3">
      <!-- Basic Info -->
      <div v-if="boxer.date_of_birth || boxer.birthDate" class="flex justify-between">
        <dt class="text-sm text-zinc-600 dark:text-zinc-400">Born</dt>
        <dd class="text-sm text-zinc-900 dark:text-white">{{ formatDate(boxer.date_of_birth || boxer.birthDate) }}</dd>
      </div>
      <div v-if="calculateAge(boxer.date_of_birth || boxer.birthDate)" class="flex justify-between">
        <dt class="text-sm text-zinc-600 dark:text-zinc-400">Age</dt>
        <dd class="text-sm text-zinc-900 dark:text-white">{{ calculateAge(boxer.date_of_birth || boxer.birthDate) }} years</dd>
      </div>
      <div v-if="boxer.birth_place || boxer.birthPlace" class="flex justify-between">
        <dt class="text-sm text-zinc-600 dark:text-zinc-400">Birthplace</dt>
        <dd class="text-sm text-zinc-900 dark:text-white text-right">{{ boxer.birth_place || boxer.birthPlace }}</dd>
      </div>
      <div v-if="boxer.residence" class="flex justify-between">
        <dt class="text-sm text-zinc-600 dark:text-zinc-400">Residence</dt>
        <dd class="text-sm text-zinc-900 dark:text-white text-right">{{ boxer.residence }}</dd>
      </div>
      <div v-if="boxer.nationality" class="flex justify-between">
        <dt class="text-sm text-zinc-600 dark:text-zinc-400">Nationality</dt>
        <dd class="text-sm text-zinc-900 dark:text-white">{{ boxer.nationality }}</dd>
      </div>
      <div v-if="boxer.gender" class="flex justify-between">
        <dt class="text-sm text-zinc-600 dark:text-zinc-400">Gender</dt>
        <dd class="text-sm text-zinc-900 dark:text-white capitalize">{{ boxer.gender }}</dd>
      </div>
      
      <!-- Physical Stats -->
      <div v-if="boxer.height" class="flex justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
        <dt class="text-sm text-zinc-600 dark:text-zinc-400">Height</dt>
        <dd class="text-sm text-zinc-900 dark:text-white">{{ formatHeight(boxer.height) }}</dd>
      </div>
      <div v-if="boxer.reach" class="flex justify-between">
        <dt class="text-sm text-zinc-600 dark:text-zinc-400">Reach</dt>
        <dd class="text-sm text-zinc-900 dark:text-white">{{ formatReach(boxer.reach) }}</dd>
      </div>
      <div v-if="boxer.weight" class="flex justify-between">
        <dt class="text-sm text-zinc-600 dark:text-zinc-400">Weight</dt>
        <dd class="text-sm text-zinc-900 dark:text-white">{{ boxer.weight }}</dd>
      </div>
      <div v-if="boxer.stance" class="flex justify-between">
        <dt class="text-sm text-zinc-600 dark:text-zinc-400">Stance</dt>
        <dd class="text-sm text-zinc-900 dark:text-white capitalize">{{ boxer.stance }}</dd>
      </div>
      
      <!-- Management Team -->
      <div v-if="boxer.promoter || boxer.trainer || boxer.manager || boxer.gym" class="pt-3 border-t border-zinc-200 dark:border-zinc-800">
        <div v-if="boxer.promoter" class="flex justify-between mb-2">
          <dt class="text-sm text-zinc-600 dark:text-zinc-400">Promoter</dt>
          <dd class="text-sm text-zinc-900 dark:text-white text-right">{{ boxer.promoter }}</dd>
        </div>
        <div v-if="boxer.trainer" class="flex justify-between mb-2">
          <dt class="text-sm text-zinc-600 dark:text-zinc-400">Trainer</dt>
          <dd class="text-sm text-zinc-900 dark:text-white text-right">{{ boxer.trainer }}</dd>
        </div>
        <div v-if="boxer.manager" class="flex justify-between mb-2">
          <dt class="text-sm text-zinc-600 dark:text-zinc-400">Manager</dt>
          <dd class="text-sm text-zinc-900 dark:text-white text-right">{{ boxer.manager }}</dd>
        </div>
        <div v-if="boxer.gym" class="flex justify-between">
          <dt class="text-sm text-zinc-600 dark:text-zinc-400">Gym</dt>
          <dd class="text-sm text-zinc-900 dark:text-white text-right">{{ boxer.gym }}</dd>
        </div>
      </div>
      
      <!-- Professional Career Stats -->
      <div class="pt-3 border-t border-zinc-200 dark:border-zinc-800">
        <div class="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Professional Career</div>
        <div v-if="boxer.pro_debut_date" class="flex justify-between mb-2">
          <dt class="text-sm text-zinc-600 dark:text-zinc-400">Debut</dt>
          <dd class="text-sm text-zinc-900 dark:text-white">{{ formatDate(boxer.pro_debut_date) }}</dd>
        </div>
        <div class="flex justify-between mb-2">
          <dt class="text-sm text-zinc-600 dark:text-zinc-400">Total Fights</dt>
          <dd class="text-sm text-zinc-900 dark:text-white">{{ boxer.pro_total_bouts || getTotalFights(boxer) }}</dd>
        </div>
        <div class="flex justify-between mb-2">
          <dt class="text-sm text-zinc-600 dark:text-zinc-400">Total Rounds</dt>
          <dd class="text-sm text-zinc-900 dark:text-white">{{ boxer.pro_total_rounds || 'N/A' }}</dd>
        </div>
        <div class="flex justify-between mb-2">
          <dt class="text-sm text-zinc-600 dark:text-zinc-400">Win Rate</dt>
          <dd class="text-sm text-zinc-900 dark:text-white">{{ boxer.pro_wins > 0 ? ((boxer.pro_wins / (boxer.pro_total_bouts || getTotalFights(boxer))) * 100).toFixed(1) : 0 }}%</dd>
        </div>
        <div class="flex justify-between mb-2">
          <dt class="text-sm text-zinc-600 dark:text-zinc-400">KO Rate</dt>
          <dd class="text-sm text-zinc-900 dark:text-white">{{ calculateKOPercentage(boxer) }}%</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-sm text-zinc-600 dark:text-zinc-400">Losses by KO</dt>
          <dd class="text-sm text-zinc-900 dark:text-white">{{ boxer.pro_losses_by_knockout || 0 }}</dd>
        </div>
      </div>
      
      <!-- Amateur Career Stats (if available) -->
      <div v-if="boxer.amateur_total_bouts && boxer.amateur_total_bouts > 0" class="pt-3 border-t border-zinc-200 dark:border-zinc-800">
        <div class="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Amateur Career</div>
        <div v-if="boxer.amateur_debut_date" class="flex justify-between mb-2">
          <dt class="text-sm text-zinc-600 dark:text-zinc-400">Debut</dt>
          <dd class="text-sm text-zinc-900 dark:text-white">{{ formatDate(boxer.amateur_debut_date) }}</dd>
        </div>
        <div class="flex justify-between mb-2">
          <dt class="text-sm text-zinc-600 dark:text-zinc-400">Total Fights</dt>
          <dd class="text-sm text-zinc-900 dark:text-white">{{ boxer.amateur_total_bouts }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-sm text-zinc-600 dark:text-zinc-400">Record</dt>
          <dd class="text-sm text-zinc-900 dark:text-white">{{ boxer.amateur_wins }}-{{ boxer.amateur_losses }}-{{ boxer.amateur_draws }}</dd>
        </div>
      </div>
    </dl>
  </div>
</template>