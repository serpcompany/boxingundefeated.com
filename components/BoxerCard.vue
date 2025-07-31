<script setup lang="ts">
import type { Boxer } from '~/types/Boxing'

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
    <UCard class="h-full hover:shadow-xl transition-all hover:-translate-y-1">
      <div class="flex flex-col h-full">
        <!-- Image -->
        <div class="aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden mb-4">
          <img 
            v-if="boxer.image" 
            :src="boxer.image" 
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
            <h3 class="text-xl font-semibold text-zinc-900 dark:text-white">
              {{ boxer.name }}
            </h3>
            <p v-if="boxer.nickname" class="text-zinc-600 dark:text-zinc-400">
              "{{ boxer.nickname }}"
            </p>
          </div>

          <div class="flex items-center gap-2 text-sm">
            <UBadge v-if="boxer.active" color="green" variant="subtle">
              Active
            </UBadge>
            <UBadge v-else color="gray" variant="subtle">
              Retired
            </UBadge>
            <span class="text-zinc-600 dark:text-zinc-400">
              {{ boxer.division?.replace(/-/g, ' ') || 'Professional' }}
            </span>
          </div>

          <div class="pt-3 mt-auto border-t border-zinc-200 dark:border-zinc-700">
            <RecordBadge
              :wins="boxer.pro_wins || boxer.record?.wins || 0"
              :losses="boxer.pro_losses || boxer.record?.losses || 0" 
              :draws="boxer.pro_draws || boxer.record?.draws || 0"
              :knockouts="boxer.pro_wins_by_knockout || boxer.record?.knockouts || 0"
              size="sm"
            />
          </div>
        </div>
      </div>
    </UCard>
  </NuxtLink>
</template>