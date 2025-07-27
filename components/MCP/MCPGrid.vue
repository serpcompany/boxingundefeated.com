<script setup lang="ts">
import type { MCP } from '~/types/Mcp'

/**
 * MCPGrid Component.
 *
 * Displays a responsive grid of MCP tool cards matching the playbooks.com
 * collection page design. Handles loading states, empty states, and
 * responsive layout for different screen sizes.
 *
 * @component
 * @example
 * ```vue
 * <MCPGrid
 *   :mcps="mcpTools"
 *   :loading="isLoading"
 *   @select="handleMCPSelect"
 * />
 * ```
 */

interface Props {
  mcps: MCP[]
  loading?: boolean
}

const _props = withDefaults(defineProps<Props>(), {
  loading: false,
})
</script>

<template>
  <div class="mcp-grid w-full">
    <!-- Loading State -->
    <div v-if="_props.loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="i in 6"
        :key="`skeleton-${i}`"
        class="animate-pulse"
      >
        <div class="bg-zinc-200 dark:bg-zinc-700 rounded-lg h-48" />
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="_props.mcps.length === 0" class="text-center py-12">
      <div class="text-zinc-500 dark:text-zinc-400 text-lg">
        No MCP tools found
      </div>
      <p class="text-sm text-zinc-400 dark:text-zinc-500 mt-2">
        Try adjusting your search criteria or filters
      </p>
    </div>

    <!-- MCP Grid -->
    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
    >
      <MCPCard
        v-for="mcp in _props.mcps"
        :key="mcp.id"
        :mcp="mcp"
      />
    </div>
  </div>
</template>
