<script setup lang="ts">
  import type { Boxer } from '~/server/db/drizzle'
  import { format, formatDistanceToNowStrict } from 'date-fns'

  interface BoxersSingleProfileProps {
    boxer: Boxer
  }

  defineProps<BoxersSingleProfileProps>()
</script>

<template>
  <BoxersSingleSection id="fighter-profile" title="Fighter Profile">
    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <dl
        class="flex flex-col divide-y divide-default *:grid *:grid-cols-3 *:gap-4 *:[&>dd]:col-span-2 *:px-4 *:py-3"
      >
        <div class="bg-muted/25 col-span-full">
          <p class="text-sm font-bold">Information</p>
        </div>
        <template v-if="boxer.dateOfBirth">
          <div class="sm:col-span-1">
            <dt class="text-sm font-medium text-highlighted">Born</dt>
            <dd class="text-sm text-muted">
              {{ formatBoxerDate(boxer.dateOfBirth) }}
            </dd>
          </div>
          <div class="sm:col-span-1">
            <dt class="text-sm font-medium text-highlighted">Age</dt>
            <dd class="text-sm text-muted">
              {{ calculateAge(boxer.dateOfBirth) }}
            </dd>
          </div>
        </template>
        <div v-if="boxer.birthPlace" class="sm:col-span-1">
          <dt class="text-sm font-medium text-highlighted">Birthplace</dt>
          <dd class="text-sm text-muted">{{ boxer.birthPlace }}</dd>
        </div>
        <div v-if="boxer.residence" class="sm:col-span-1">
          <dt class="text-sm font-medium text-highlighted">Residence</dt>
          <dd class="text-sm text-muted">{{ boxer.residence }}</dd>
        </div>
        <div v-if="boxer.nationality" class="sm:col-span-1">
          <dt class="text-sm font-medium text-highlighted">Nationality</dt>
          <dd class="text-sm text-muted">{{ boxer.nationality }}</dd>
        </div>
        <div v-if="boxer.gender" class="sm:col-span-1">
          <dt class="text-sm font-medium text-highlighted">Gender</dt>
          <dd class="text-sm text-muted">
            {{ boxer.gender === 'M' ? 'Male' : 'Female' }}
          </dd>
        </div>

        <template v-if="boxer.height || boxer.reach || boxer.stance">
          <div class="bg-muted/25 col-span-full">
            <p class="text-sm font-bold">Stats</p>
          </div>
          <div v-if="boxer.height">
            <dt class="text-sm font-medium text-highlighted">Height</dt>
            <dd class="text-sm text-muted">{{ boxer.height }} cm</dd>
          </div>
          <div v-if="boxer.reach">
            <dt class="text-sm font-medium text-highlighted">Reach</dt>
            <dd class="text-sm text-muted">{{ boxer.reach }} cm</dd>
          </div>
          <div v-if="boxer.stance">
            <dt class="text-sm font-medium text-highlighted">Stance</dt>
            <dd class="text-sm text-muted capitalize">{{ boxer.stance }}</dd>
          </div>
        </template>

        <!-- Professional Career Stats -->
        <div class="bg-muted/25 col-span-full">
          <p class="text-sm font-bold">Professional Career</p>
        </div>
        <div v-if="boxer.proDebutDate">
          <dt class="text-sm font-medium text-highlighted">Debut</dt>
          <dd class="text-sm text-muted capitalize">
            {{ format(boxer.proDebutDate, 'MMMM dd, yyyy') }}
          </dd>
        </div>
        <div v-if="boxer.proTotalBouts">
          <dt class="text-sm font-medium text-highlighted">Total Fights</dt>
          <dd class="text-sm text-muted capitalize">
            {{ boxer.proTotalBouts }}
          </dd>
        </div>
        <div v-if="boxer.proTotalRounds">
          <dt class="text-sm font-medium text-highlighted">Total Rounds</dt>
          <dd class="text-sm text-muted capitalize">
            {{ boxer.proTotalRounds }}
          </dd>
        </div>
        <div v-if="boxer.proWins && boxer.proTotalBouts">
          <dt class="text-sm font-medium text-highlighted">Win Rate</dt>
          <dd class="text-sm text-muted capitalize">
            {{ calculateWinRate(boxer.proWins, boxer.proTotalBouts) }}
          </dd>
        </div>
        <div>
          <dt class="text-sm font-medium text-highlighted">Losses by KO</dt>
          <dd class="text-sm text-muted capitalize">
            {{ boxer.proLossesByKnockout || 0 }}
          </dd>
        </div>

        <!-- Amateur Career Stats (if available) -->
        <template v-if="boxer.amateurTotalBouts && boxer.amateurTotalBouts > 0">
          <div class="bg-muted/25 col-span-full">
            <p class="text-sm font-bold">Amateur Career</p>
          </div>
          <div v-if="boxer.amateurDebutDate">
            <dt class="text-sm font-medium text-highlighted">Debut</dt>
            <dd class="text-sm text-muted capitalize">
              {{ format(boxer.amateurDebutDate, 'MMMM dd, yyyy') }}
            </dd>
          </div>
          <div v-if="boxer.amateurTotalBouts">
            <dt class="text-sm font-medium text-highlighted">Total Fights</dt>
            <dd class="text-sm text-muted capitalize">
              {{ boxer.amateurTotalBouts }}
            </dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-highlighted">Record</dt>
            <dd class="text-sm text-muted capitalize">
              {{
                `${boxer.amateurWins}-${boxer.amateurLosses}-${boxer.amateurDraws}`
              }}
            </dd>
          </div>
        </template>
      </dl>
    </UCard>
  </BoxersSingleSection>
</template>
