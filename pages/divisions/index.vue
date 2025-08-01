<script setup lang="ts">
const { site } = useAppConfig()

// Fetch divisions from API
const { data, pending, error } = await useFetch('/api/divisions')

const divisions = computed(() => {
  if (!data.value?.divisions) return []
  return data.value.divisions
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
  <div class="min-h-screen bg-white dark:bg-zinc-900">
    <!-- Breadcrumbs -->
    <div class="bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
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
      <div class="mb-8">
        <p class="text-zinc-600 dark:text-zinc-400">
          Boxing has {{ divisions.length }} recognized weight divisions, each with specific weight limits to ensure fair competition.
        </p>
      </div>

      <!-- Divisions Table -->
      <div class="bg-white dark:bg-zinc-800 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
        <DivisionsTable v-if="data" :divisions="data.value.divisions" />
      </div>
    </div>
  </div>
</template>