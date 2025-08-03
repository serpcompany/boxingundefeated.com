<script setup lang="ts">
import type { Boxer } from '~/types'

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
  if (boxer.proTotalBouts !== undefined && boxer.proTotalBouts !== null) {
    return boxer.proTotalBouts
  }
  return (boxer.proWins || 0) + (boxer.proLosses || 0) + (boxer.proDraws || 0)
}

function calculateKOPercentage(boxer: Boxer): string {
  const wins = boxer.proWins || 0
  const kos = boxer.proWinsByKnockout || 0
  if (wins === 0) return '0'
  return ((kos / wins) * 100).toFixed(1)
}
</script>

<template>
  <div id="fighter-information" class="bg-white rounded-lg p-6 border border-zinc-200">
    <h3 class="text-lg font-semibold text-zinc-900 mb-4">Fighter Information</h3>
    <dl class="space-y-3">
      <!-- Basic Info -->
      <div v-if="boxer.dateOfBirth" class="data-row">
        <dt class="data-label">Born</dt>
        <dd class="data-value">{{ formatDate(boxer.dateOfBirth) }}</dd>
      </div>
      <div v-if="calculateAge(boxer.dateOfBirth)" class="data-row">
        <dt class="data-label">Age</dt>
        <dd class="data-value">{{ calculateAge(boxer.dateOfBirth) }} years</dd>
      </div>
      <div v-if="boxer.birthPlace" class="data-row">
        <dt class="data-label">Birthplace</dt>
        <dd class="data-value">{{ boxer.birthPlace }}</dd>
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
      <div v-if="boxer.promoters || boxer.trainers || boxer.managers || boxer.gym" class="data-section">
        <div v-if="boxer.promoters" class="data-row mb-2">
          <dt class="data-label">Promoter</dt>
          <dd class="data-value">{{ boxer.promoters }}</dd>
        </div>
        <div v-if="boxer.trainers" class="data-row mb-2">
          <dt class="data-label">Trainer</dt>
          <dd class="data-value">{{ boxer.trainers }}</dd>
        </div>
        <div v-if="boxer.managers" class="data-row mb-2">
          <dt class="data-label">Manager</dt>
          <dd class="data-value">{{ boxer.managers }}</dd>
        </div>
        <div v-if="boxer.gym" class="data-row">
          <dt class="data-label">Gym</dt>
          <dd class="data-value">{{ boxer.gym }}</dd>
        </div>
      </div>
      
      <!-- Professional Career Stats -->
      <div class="data-section">
        <div class="data-section-title">Professional Career</div>
        <div v-if="boxer.proDebutDate" class="data-row mb-2">
          <dt class="data-label">Debut</dt>
          <dd class="data-value">{{ formatDate(boxer.proDebutDate) }}</dd>
        </div>
        <div class="data-row mb-2">
          <dt class="data-label">Total Fights</dt>
          <dd class="data-value">{{ boxer.proTotalBouts || getTotalFights(boxer) }}</dd>
        </div>
        <div class="data-row mb-2">
          <dt class="data-label">Total Rounds</dt>
          <dd class="data-value">{{ boxer.proTotalRounds || 'N/A' }}</dd>
        </div>
        <div class="data-row mb-2">
          <dt class="data-label">Win Rate</dt>
          <dd class="data-value">{{ boxer.proWins > 0 ? ((boxer.proWins / (boxer.proTotalBouts || getTotalFights(boxer))) * 100).toFixed(1) : 0 }}%</dd>
        </div>
        <div class="data-row mb-2">
          <dt class="data-label">KO Rate</dt>
          <dd class="data-value">{{ calculateKOPercentage(boxer) }}%</dd>
        </div>
        <div class="data-row">
          <dt class="data-label">Losses by KO</dt>
          <dd class="data-value">{{ boxer.proLossesByKnockout || 0 }}</dd>
        </div>
      </div>
      
      <!-- Amateur Career Stats (if available) -->
      <div v-if="boxer.amateurTotalBouts && boxer.amateurTotalBouts > 0" class="data-section">
        <div class="data-section-title">Amateur Career</div>
        <div v-if="boxer.amateurDebutDate" class="data-row mb-2">
          <dt class="data-label">Debut</dt>
          <dd class="data-value">{{ formatDate(boxer.amateurDebutDate) }}</dd>
        </div>
        <div class="data-row mb-2">
          <dt class="data-label">Total Fights</dt>
          <dd class="data-value">{{ boxer.amateurTotalBouts }}</dd>
        </div>
        <div class="data-row">
          <dt class="data-label">Record</dt>
          <dd class="data-value">{{ boxer.amateurWins }}-{{ boxer.amateurLosses }}-{{ boxer.amateurDraws }}</dd>
        </div>
      </div>
    </dl>
  </div>
</template>