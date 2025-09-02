<script setup lang="ts">
  import type { Boxer } from '~/server/db/drizzle'

  defineProps<{
    boxer: Boxer
  }>()
</script>
<template>
  <div class="relative isolate">
    <UContainer class="py-8 sm:py-12 md:py-16">
      <div class="flex flex-col items-center gap-6 sm:flex-row">
        <div class="shrink-0">
          <UAvatar
            :src="boxer.avatarImage!"
            :alt="boxer.name"
            :ui="{
              root: 'size-48',
              icon: 'size-16',
            }"
            icon="lucide:user"
          />
        </div>

        <div class="flex-1 space-y-4">
          <h1
            class="text-2xl text-highlighted font-bold text-center sm:text-left sm:text-4xl"
          >
            {{ boxer.name }}

            <template v-if="boxer.nicknames">
              <span class="block text-muted font-normal sm:inline">
                "{{ parseBoxerNickname(boxer.nicknames) }}"
              </span>
            </template>
          </h1>

          <div
            class="flex flex-wrap justify-center items-center gap-4 sm:justify-start"
          >
            <DivisionBadge :division="boxer.proDivision!" />
            <StatusBadge :active="boxer.proStatus !== 'inactive'" size="md" />
          </div>
        </div>
      </div>
    </UContainer>
  </div>
</template>
