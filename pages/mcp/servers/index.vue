<script setup lang="ts">
/**
 * MCP Servers Collection Page.
 *
 * Displays a collection of MCP server cards with filtering, sorting, and search functionality.
 * Based on the original collection page logic for MCP type.
 *
 * @component
 * @example
 * ```
 * /mcp/servers - Shows collection of MCP server cards
 * ```
 */

import type { MCP, MCPFilters } from '~/types/Mcp'
import { mockMCPTools } from '~/data/mcp-tools'

// SEO metadata
useSeoMeta({
  title: 'MCP Tools Collection · Find servers to give AI agents superpowers',
  description: 'Search through MCP servers and add them to Claude Desktop, Windsurf, and other AI agents using the Model Context Protocol.',
})

// Reactive state
const loading = ref(false)
const currentPage = ref(1)
const itemsPerPage = 12

// Filter state (using MCP filter structure)
const filters = ref<MCPFilters>({
  categories: [],
  compatibility: [],
  search: '',
  sortBy: 'name',
})

// Data management
const allItems = ref(mockMCPTools)

// Computed properties
const totalItems = computed(() => allItems.value.length)

const availableCategories = computed(() => {
  const categories = new Set(allItems.value.map((item: MCP) => item.category))
  return Array.from(categories).sort()
})

const availableCompatibility = computed(() => {
  const compatibility = new Set(allItems.value.flatMap((item: MCP) => item.compatibility))
  return Array.from(compatibility).sort()
})

// Filter and search logic (based on collection page)
const filteredItems = computed(() => {
  let result = [...allItems.value]

  // Search filter
  if (filters.value.search) {
    const searchTerm = filters.value.search.toLowerCase()
    result = result.filter((item: MCP) =>
      item.name?.toLowerCase().includes(searchTerm)
      || item.description.toLowerCase().includes(searchTerm)
      || item.author?.toLowerCase().includes(searchTerm)
      || item.tags?.some((tag: string) => tag.toLowerCase().includes(searchTerm)),
    )
  }

  // Category filter
  if (filters.value.categories.length > 0) {
    result = result.filter((item: MCP) =>
      filters.value.categories.includes(item.category),
    )
  }

  // Compatibility filter
  if (filters.value.compatibility.length > 0) {
    result = result.filter((item: MCP) =>
      filters.value.compatibility.some(compat =>
        item.compatibility.includes(compat),
      ),
    )
  }

  // Sorting
  result.sort((a: MCP, b: MCP) => {
    switch (filters.value.sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'views':
        return b.views - a.views
      case 'copies':
        return b.copies - a.copies
      case 'likes':
        return b.likes - a.likes
      case 'updated':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      case 'created':
        return new Date(b.createdAt || b.updatedAt).getTime()
          - new Date(a.createdAt || a.updatedAt).getTime()
      default:
        return 0
    }
  })

  return result
})

// Pagination
const totalPages = computed(() => Math.ceil(filteredItems.value.length / itemsPerPage))

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredItems.value.slice(start, end)
})

// Event handlers (based on collection page)
function handleFiltersUpdate(newFilters: MCPFilters) {
  filters.value = { ...newFilters }
  currentPage.value = 1 // Reset to first page when filters change
}

function handleItemSelect(item: MCP) {
  navigateTo(`/mcp/servers/${item.slug}`)
}

function clearAllFilters() {
  filters.value = {
    categories: [],
    compatibility: [],
    search: '',
    sortBy: 'name',
  }
  currentPage.value = 1
}
</script>

<template>
  <div class="collection-page min-h-screen bg-zinc-50 dark:bg-zinc-900">
    <!-- Collection Header -->
    <CollectionHeader
      title="Find MCP servers to give AI agents superpowers"
      description="Search through MCP servers and add them to Claude Desktop, Windsurf,
                   and other AI agents using the Model Context Protocol."
      :total-items="totalItems"
      collection-type="mcps"
    />

    <!-- Main Content Area -->
    <div class="max-w-7xl mx-auto px-6 lg:px-8 py-8">
      <!-- Filters and Search Bar (moved to top) -->
      <div class="mb-8">
        <MCPFilters
          :filters="filters"
          :available-categories="availableCategories"
          :available-compatibility="availableCompatibility"
          :all-items="allItems"
          @update-filters="handleFiltersUpdate"
        />
      </div>

      <!-- Main Content -->
      <main>
        <!-- Collection Grid -->
        <MCPGrid
          :mcps="paginatedItems"
          :loading="loading"
          @select="handleItemSelect"
        />

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="mt-8 flex justify-center">
          <UPagination
            v-model="currentPage"
            :page-count="itemsPerPage"
            :total="filteredItems.length"
            :max="7"
            show-last
            show-first
          />
        </div>

        <!-- Empty State -->
        <div v-if="filteredItems.length === 0 && !loading" class="text-center py-12">
          <UIcon name="i-heroicons-magnifying-glass" class="w-12 h-12 text-zinc-400 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-zinc-900 dark:text-white mb-2">
            No items found
          </h3>
          <p class="text-zinc-600 dark:text-zinc-400 mb-4">
            Try adjusting your search criteria or filters
          </p>
          <UButton variant="soft" @click="clearAllFilters">
            Clear all filters
          </UButton>
        </div>
      </main>
    </div>
  </div>
</template>
