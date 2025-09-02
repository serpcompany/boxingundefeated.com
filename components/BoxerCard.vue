<script setup lang="ts">
import type { Boxer } from '~/types'

interface Props {
  boxer: Boxer
}

const props = defineProps<Props>()
</script>

<template>
  <NuxtLink
    :to="`/boxers/${boxer.slug}`"
    class="block h-full"
  >
    <UCard class="h-full hover:border-zinc-300 transition-colors">
      <div class="flex flex-col h-full">
        <!-- Image -->
        <div class="aspect-square bg-zinc-100 rounded-lg overflow-hidden mb-4">
          <img
            v-if="boxer.avatarImage"
            :src="boxer.avatarImage"
            :alt="boxer.name"
            class="w-full h-full object-cover"
          >
          <div v-else class="w-full h-full flex items-center justify-center">
            <UIcon name="i-heroicons-user" class="w-20 h-20 text-zinc-400" />
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 space-y-3">
          <div>
            <h3 class="text-xl font-semibold text-zinc-900">
              {{ boxer.name }}
            </h3>
            <p v-if="boxer.nicknames" class="text-zinc-600">
              "{{ boxer.nicknames }}"
            </p>
          </div>

          <div class="flex items-center gap-2 text-sm">
            <UBadge v-if="boxer.proStatus !== 'inactive'" color="green" variant="subtle">
              Active
            </UBadge>
            <UBadge v-else color="neutral" variant="subtle">
              Retired
            </UBadge>
            <span class="text-zinc-600">
              {{ boxer.proDivision?.replace(/-/g, ' ') || 'Professional' }}
            </span>
          </div>

          <div class="pt-3 mt-auto border-t border-zinc-200">
            <RecordBadge
              :wins="boxer.proWins || 0"
              :losses="boxer.proLosses || 0"
              :draws="boxer.proDraws || 0"
              :knockouts="boxer.proWinsByKnockout || 0"
              size="sm"
            />
          </div>
        </div>
      </div>
    </UCard>
  </NuxtLink>
</template>
