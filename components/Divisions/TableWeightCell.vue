<script setup lang="ts">
  import type { Division } from '~/server/db/drizzle'

  interface TableWeightCellProps {
    division: Division
  }

  const props = defineProps<TableWeightCellProps>()
</script>

<template>
  <div class="flex justify-start">
    <div class="flex flex-col items-start gap-1">
      <template v-if="division.slug === 'heavyweight'">
        <p class="font-medium text-sm text-highlighted">No limit</p>
      </template>
      <template v-else>
        <p class="font-medium text-sm text-highlighted">
          {{ division.weightLimitPounds }} lbs
        </p>
        <p class="font-medium text-xs text-muted">
          {{ poundsToKg(division.weightLimitPounds) }} kg
          <template v-if="division.weightLimitStone">
            / {{ division.weightLimitStone }}
          </template>
        </p>
      </template>
    </div>
  </div>
</template>
