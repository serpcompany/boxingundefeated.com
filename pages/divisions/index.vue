<script setup lang="ts">
const { site } = useAppConfig()

// Fetch divisions from API
const { data, pending, error } = await useFetch('/api/divisions')

const divisions = computed(() => {
  if (!data.value?.divisions) return []
  // Sort by weight limit descending (heaviest first)
  return [...data.value.divisions].sort((a, b) => b.weightLimitPounds - a.weightLimitPounds)
})

const title = 'Professional Boxing Weight Classes'
const description = `Explore all ${divisions.value.length} professional boxing weight divisions from minimumweight to heavyweight. Learn about weight limits and division history.`

useSeoMeta({
  title,
  description,
})

function formatWeightLimit(division: any) {
  const kilograms = division.weightLimitPounds * 0.453592
  return `${division.weightLimitPounds} lbs / ${kilograms.toFixed(1)} kg`
}

</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Breadcrumbs -->
    <div class="bg-white border-b border-neutral-100">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <BreadCrumbs
          :items="[
            { label: 'Divisions' }
          ]"
        />
      </div>
    </div>

    <!-- Header -->
    <PageHero
      title="Weight Divisions"
    />

    <!-- Main Content -->
    <div class="max-w-6xl mx-auto px-6 lg:px-8 py-12">
      <!-- Divisions Table -->
      <div class="bg-white rounded-lg overflow-hidden border border-zinc-200">
        <DivisionsTable v-if="divisions.length > 0" :divisions="divisions" />
      </div>
    </div>
  </div>
</template>
