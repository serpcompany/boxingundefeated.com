<script setup lang="ts">
import type { BoxerFilters } from '~/types/Boxing'
import { mockBoxers, mockDivisions } from '~/data/boxing-data'

useSeoMeta({
  title: 'Boxers - Boxing Undefeated',
  description: 'Browse profiles of professional boxers from around the world. Filter by weight division and search for your favorite fighters.',
})

const loading = ref(false)
const currentPage = ref(1)
const itemsPerPage = 12

const filters = ref<BoxerFilters>({
  divisions: [],
  search: '',
  sortBy: 'name',
  active: undefined,
})

const allBoxers = ref(mockBoxers)

const availableDivisions = computed(() => {
  const divisionSlugs = new Set(allBoxers.value.map(boxer => boxer.division))
  return mockDivisions.filter(d => divisionSlugs.has(d.slug)).map(d => d.slug)
})

const filteredBoxers = computed(() => {
  let result = [...allBoxers.value]

  if (filters.value.search) {
    const searchTerm = filters.value.search.toLowerCase()
    result = result.filter(boxer =>
      boxer.name.toLowerCase().includes(searchTerm) ||
      boxer.nickname?.toLowerCase().includes(searchTerm) ||
      boxer.nationality?.toLowerCase().includes(searchTerm),
    )
  }

  if (filters.value.divisions.length > 0) {
    result = result.filter(boxer =>
      filters.value.divisions.includes(boxer.division),
    )
  }

  if (filters.value.active !== undefined) {
    result = result.filter(boxer => boxer.active === filters.value.active)
  }

  result.sort((a, b) => {
    switch (filters.value.sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'record':
        return b.record.wins - a.record.wins
      case 'updated':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      case 'created':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      default:
        return 0
    }
  })

  return result
})

const totalPages = computed(() => Math.ceil(filteredBoxers.value.length / itemsPerPage))

const paginatedBoxers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredBoxers.value.slice(start, end)
})

function handleFiltersUpdate(newFilters: BoxerFilters) {
  filters.value = { ...newFilters }
  currentPage.value = 1
}

function clearAllFilters() {
  filters.value = {
    divisions: [],
    search: '',
    sortBy: 'name',
    active: undefined,
  }
  currentPage.value = 1
}
</script>

<template>
  <div class="min-h-screen bg-zinc-50 dark:bg-zinc-900">
    <!-- Header -->
    <div class="bg-gradient-to-br from-red-600 to-red-800 text-white">
      <div class="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <h1 class="text-4xl font-bold mb-4">Professional Boxers</h1>
        <p class="text-xl text-red-100">
          Browse {{ allBoxers.length }} fighter profiles
        </p>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-6 lg:px-8 py-8">
      <!-- Filters -->
      <div class="mb-8 space-y-4">
        <!-- Search -->
        <div class="flex gap-4 items-center">
          <UInput
            v-model="filters.search"
            placeholder="Search boxers..."
            size="lg"
            class="flex-1"
            icon="i-heroicons-magnifying-glass"
          />
          <USelectMenu
            v-model="filters.sortBy"
            :options="[
              { label: 'Name', value: 'name' },
              { label: 'Record', value: 'record' },
              { label: 'Recently Updated', value: 'updated' },
              { label: 'Recently Added', value: 'created' },
            ]"
            value-attribute="value"
            option-attribute="label"
            size="lg"
          />
        </div>

        <!-- Filter Chips -->
        <div class="flex flex-wrap gap-2">
          <USelectMenu
            v-model="filters.active"
            :options="[
              { label: 'All Fighters', value: undefined },
              { label: 'Active Only', value: true },
              { label: 'Retired Only', value: false },
            ]"
            value-attribute="value"
            option-attribute="label"
          />
          
          <USelectMenu
            v-model="filters.divisions"
            :options="availableDivisions"
            multiple
            placeholder="Filter by division"
          >
            <template #label>
              <span v-if="filters.divisions.length === 0">All Divisions</span>
              <span v-else>{{ filters.divisions.length }} divisions</span>
            </template>
          </USelectMenu>

          <UButton
            v-if="filters.search || filters.divisions.length > 0 || filters.active !== undefined"
            @click="clearAllFilters"
            variant="ghost"
            color="red"
            size="sm"
          >
            Clear filters
          </UButton>
        </div>
      </div>

      <!-- Boxers Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <UCard
          v-for="boxer in paginatedBoxers"
          :key="boxer.id"
          class="hover:shadow-xl transition-shadow"
        >
          <template #header>
            <div class="aspect-square bg-zinc-200 dark:bg-zinc-700 rounded-lg overflow-hidden">
              <img
                v-if="boxer.image"
                :src="boxer.image"
                :alt="boxer.name"
                class="w-full h-full object-cover"
              >
            </div>
          </template>

          <div class="space-y-3">
            <div>
              <h3 class="text-lg font-semibold text-zinc-900 dark:text-white">
                {{ boxer.name }}
              </h3>
              <p v-if="boxer.nickname" class="text-sm text-zinc-600 dark:text-zinc-400">
                "{{ boxer.nickname }}"
              </p>
            </div>

            <div class="flex items-center gap-2">
              <UBadge v-if="boxer.active" color="green" variant="subtle" size="xs">
                Active
              </UBadge>
              <UBadge v-else color="gray" variant="subtle" size="xs">
                Retired
              </UBadge>
              <span class="text-xs text-zinc-600 dark:text-zinc-400">
                {{ boxer.division.replace(/-/g, ' ') }}
              </span>
            </div>

            <div class="space-y-1 text-sm">
              <p class="text-zinc-600 dark:text-zinc-400">
                <span class="font-medium">Record:</span> 
                {{ boxer.record.wins }}-{{ boxer.record.losses }}-{{ boxer.record.draws }}
              </p>
              <p class="text-zinc-600 dark:text-zinc-400">
                <span class="font-medium">KOs:</span> {{ boxer.record.knockouts }}
              </p>
              <p v-if="boxer.nationality" class="text-zinc-600 dark:text-zinc-400">
                <span class="font-medium">Country:</span> {{ boxer.nationality }}
              </p>
            </div>

            <UButton
              :to="`/boxers/${boxer.slug}`"
              variant="soft"
              color="red"
              class="w-full"
              size="sm"
            >
              View Profile
            </UButton>
          </div>
        </UCard>
      </div>

      <!-- Empty State -->
      <div v-if="filteredBoxers.length === 0 && !loading" class="text-center py-12">
        <UIcon name="i-heroicons-users" class="w-12 h-12 text-zinc-400 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-zinc-900 dark:text-white mb-2">
          No boxers found
        </h3>
        <p class="text-zinc-600 dark:text-zinc-400 mb-4">
          Try adjusting your search criteria or filters
        </p>
        <UButton variant="soft" @click="clearAllFilters">
          Clear all filters
        </UButton>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="mt-8 flex justify-center">
        <UPagination
          v-model="currentPage"
          :page-count="itemsPerPage"
          :total="filteredBoxers.length"
          :max="7"
          show-last
          show-first
        />
      </div>
    </div>
  </div>
</template>