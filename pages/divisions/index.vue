<script setup lang="ts">
  import type { Division } from '~/server/db/drizzle'

  const { site } = useAppConfig()

  const { data, pending } = await useFetch('/api/divisions', {
    transform: (input) => {
      // Sort by weight limit descending (heaviest first)
      const divisions = input.divisions.toSorted(
        (a, b) => b.weightLimitPounds - a.weightLimitPounds,
      ) as unknown as Division[]

      return {
        ...input,
        divisions,
      }
    },
  })

  useSeoMeta({
    title: 'Professional Boxing Weight Classes',
    description: () =>
      `Explore all ${data.value?.divisions.length} professional boxing weight divisions from minimumweight to heavyweight. Learn about weight limits and division history.`,
  })
</script>

<template>
  <div>
    <div class="bg-default border-b border-muted">
      <UContainer class="py-3">
        <BreadCrumbs :items="[{ label: 'Divisions' }]" />
      </UContainer>
    </div>

    <UPageHero
      title="Weight Divisions"
      description="Explore all professional boxing weight divisions from minimumweight to heavyweight."
      :ui="{ wrapper: 'text-left' }"
    />

    <UPageSection v-if="data">
      <DivisionsTable :data="data.divisions" :loading="pending" />
    </UPageSection>
  </div>
</template>
