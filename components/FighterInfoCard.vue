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
      <div v-if="boxer.date_of_birth || boxer.birthDate" class="data-row">
        <dt class="data-label">Born</dt>
        <dd class="data-value">{{ formatDate(boxer.date_of_birth || boxer.birthDate) }}</dd>
      </div>
      <div v-if="calculateAge(boxer.date_of_birth || boxer.birthDate)" class="data-row">
        <dt class="data-label">Age</dt>
        <dd class="data-value">{{ calculateAge(boxer.date_of_birth || boxer.birthDate) }} years</dd>
      </div>
      <div v-if="boxer.birth_place || boxer.birthPlace" class="data-row">
        <dt class="data-label">Birthplace</dt>
        <dd class="data-value">{{ boxer.birth_place || boxer.birthPlace }}</dd>
      </div>
      <div v-if="boxer.residence" class="data-row">
        <dt class="data-label">Residence</dt>
        <dd class="data-value">{{ boxer.residence }}</dd>
      </div>
      <div v-if="boxer.nationality" class="data-row">
        <dt class="data-label">Nationality</dt>
        <dd class="data-value">{{ boxer.nationality }}</dd>
      </div>
      <div v-if="boxer.gender" class="data-row">
        <dt class="data-label">Gender</dt>
        <dd class="data-value capitalize">{{ boxer.gender }}</dd>
      </div>
      
      <!-- Physical Stats -->
      <div v-if="boxer.height" class="data-row data-section">
        <dt class="data-label">Height</dt>
        <dd class="data-value">{{ formatHeight(boxer.height) }}</dd>
      </div>
      <div v-if="boxer.reach" class="data-row">
        <dt class="data-label">Reach</dt>
        <dd class="data-value">{{ formatReach(boxer.reach) }}</dd>
      </div>
      <div v-if="boxer.weight" class="data-row">
        <dt class="data-label">Weight</dt>
        <dd class="data-value">{{ boxer.weight }}</dd>
      </div>
      <div v-if="boxer.stance" class="data-row">
        <dt class="data-label">Stance</dt>
        <dd class="data-value capitalize">{{ boxer.stance }}</dd>
      </div>
      
      <!-- Management Team -->
      <div v-if="boxer.promoter || boxer.trainer || boxer.manager || boxer.gym" class="data-section">
        <div v-if="boxer.promoter" class="data-row mb-2">
          <dt class="data-label">Promoter</dt>
          <dd class="data-value">{{ boxer.promoter }}</dd>
        </div>
        <div v-if="boxer.trainer" class="data-row mb-2">
          <dt class="data-label">Trainer</dt>
          <dd class="data-value">{{ boxer.trainer }}</dd>
        </div>
        <div v-if="boxer.manager" class="data-row mb-2">
          <dt class="data-label">Manager</dt>
          <dd class="data-value">{{ boxer.manager }}</dd>
        </div>
        <div v-if="boxer.gym" class="data-row">
          <dt class="data-label">Gym</dt>
          <dd class="data-value">{{ boxer.gym }}</dd>
        </div>
      </div>
      
      <!-- Professional Career Stats -->
      <div class="data-section">
        <div class="data-section-title">Professional Career</div>
        <div v-if="boxer.pro_debut_date" class="data-row mb-2">
          <dt class="data-label">Debut</dt>
          <dd class="data-value">{{ formatDate(boxer.pro_debut_date) }}</dd>
        </div>
        <div class="data-row mb-2">
          <dt class="data-label">Total Fights</dt>
          <dd class="data-value">{{ boxer.pro_total_bouts || getTotalFights(boxer) }}</dd>
        </div>
        <div class="data-row mb-2">
          <dt class="data-label">Total Rounds</dt>
          <dd class="data-value">{{ boxer.pro_total_rounds || 'N/A' }}</dd>
        </div>
        <div class="data-row mb-2">
          <dt class="data-label">Win Rate</dt>
          <dd class="data-value">{{ boxer.pro_wins > 0 ? ((boxer.pro_wins / (boxer.pro_total_bouts || getTotalFights(boxer))) * 100).toFixed(1) : 0 }}%</dd>
        </div>
        <div class="data-row mb-2">
          <dt class="data-label">KO Rate</dt>
          <dd class="data-value">{{ calculateKOPercentage(boxer) }}%</dd>
        </div>
        <div class="data-row">
          <dt class="data-label">Losses by KO</dt>
          <dd class="data-value">{{ boxer.pro_losses_by_knockout || 0 }}</dd>
        </div>
      </div>
      
      <!-- Amateur Career Stats (if available) -->
      <div v-if="boxer.amateur_total_bouts && boxer.amateur_total_bouts > 0" class="data-section">
        <div class="data-section-title">Amateur Career</div>
        <div v-if="boxer.amateur_debut_date" class="data-row mb-2">
          <dt class="data-label">Debut</dt>
          <dd class="data-value">{{ formatDate(boxer.amateur_debut_date) }}</dd>
        </div>
        <div class="data-row mb-2">
          <dt class="data-label">Total Fights</dt>
          <dd class="data-value">{{ boxer.amateur_total_bouts }}</dd>
        </div>
        <div class="data-row">
          <dt class="data-label">Record</dt>
          <dd class="data-value">{{ boxer.amateur_wins }}-{{ boxer.amateur_losses }}-{{ boxer.amateur_draws }}</dd>
        </div>
      </div>
    </dl>
  </div>
</template>