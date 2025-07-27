<script setup lang="ts">
import type { MCP } from '~/types/Mcp'

/**
 * MCPCard Component.
 *
 * Displays an individual MCP tool as a card with image, title, description,
 * stats, tags, and action buttons. Follows the design patterns established
 * in the playbooks.com reference design.
 *
 * @component
 * @example
 * ```vue
 * <MCPCard
 *   :mcp="mcpTool"
 *   @select="handleSelect"
 *   @view-details="handleViewDetails"
 * />
 * ```
 */

interface Props {
  /** MCP tool data to display. */
  mcp: MCP
  viewMode?: 'grid' | 'list'
}

defineProps<Props>()

/**
 * Format large numbers with K/M suffixes.
 * @param num - Number to format.
 * @returns Formatted string (e.g., "1.2K", "5.4M").
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}
</script>

<template>
  <UCard
    class="mcp-card group hover:shadow-lg hover:-translate-y-1 transition-all duration-300
        border border-zinc-200 dark:border-zinc-700 cursor-pointer overflow-hidden
        hover:border-zinc-300 dark:hover:border-zinc-600 min-w-[350px]"
  >
    <div class="p-5 space-y-4">
      <div class="flex items-start justify-between">
        <div class="flex items-center space-x-3">
          <div
            class="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600
              rounded-lg flex items-center justify-center"
          >
            <UIcon name="i-heroicons-server-stack" class="w-4 h-4 text-white" />
          </div>
          <NuxtLink :to="`/mcp/servers/${mcp.slug}`" class="block">
            <div class="min-w-0 flex-1">
              <h3
                class="font-semibold text-zinc-900 dark:text-white text-base leading-tight
                group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
              >
                {{ mcp.name }}
              </h3>
              <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                by {{ mcp.author }}
              </p>
            </div>
          </NuxtLink>
        </div>
        <UBadge
          :label="mcp.category"
          variant="soft"
          size="sm"
          class="flex-shrink-0"
        />
      </div>

      <!-- Description -->
      <p class="text-sm text-zinc-600 dark:text-zinc-300 line-clamp-2 leading-relaxed">
        {{ mcp.description }}
      </p>

      <!-- Tags -->
      <div class="flex flex-wrap gap-1.5">
        <UBadge
          v-for="tag in mcp.tags.slice(0, 3)"
          :key="tag"
          class="inline-flex items-center px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800
              text-xs text-zinc-600 dark:text-zinc-400 font-medium"
        >
          {{ tag }}
        </UBadge>
        <span
          v-if="mcp.tags.length > 3"
          class="inline-flex items-center px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800
              text-xs text-zinc-500 dark:text-zinc-500 font-medium"
        >
          +{{ mcp.tags.length - 3 }}
        </span>
      </div>

      <!-- Stats Row -->
      <div
        class="flex items-center justify-between pt-3
                 border-t border-zinc-100 dark:border-zinc-800"
      >
        <div class="flex items-center space-x-4 text-xs text-zinc-500 dark:text-zinc-400">
          <div class="flex items-center space-x-1.5">
            <UIcon name="i-heroicons-eye" class="w-3.5 h-3.5" />
            <span class="font-medium">{{ formatNumber(mcp.views) }}</span>
          </div>
          <div class="flex items-center space-x-1.5">
            <UIcon name="i-heroicons-document-duplicate" class="w-3.5 h-3.5" />
            <span class="font-medium">{{ formatNumber(mcp.copies) }}</span>
          </div>
          <div class="flex items-center space-x-1.5">
            <UIcon name="i-heroicons-heart" class="w-3.5 h-3.5" />
            <span class="font-medium">{{ formatNumber(mcp.likes) }}</span>
          </div>
        </div>
        <UButton
          :to="`/mcp/servers/${mcp.slug}`"
          variant="ghost"
        >
          <UIcon
            name="i-heroicons-arrow-top-right-on-square"
            class="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300
              transition-colors"
          />
        </UButton>
      </div>
    </div>
  </UCard>
</template>

<style scoped>
.mcp-card {
  height: 100%;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
