<script setup lang="ts">
  import type { Boxer } from '~/server/db/drizzle'

  interface TableRecordCellProps {
    boxer: Boxer
  }

  defineProps<TableRecordCellProps>()
</script>

<template>
  <div class="flex justify-start">
    <div class="flex flex-col items-start gap-1">
      <p class="font-medium text-sm text-highlighted">
        {{ `${boxer.proWins}-${boxer.proLosses}-${boxer.proDraws}` }}
      </p>
      <p class="font-medium text-xs text-muted">
        {{ boxer.proWinsByKnockout }} KOs
      </p>
    </div>
  </div>
</template>
