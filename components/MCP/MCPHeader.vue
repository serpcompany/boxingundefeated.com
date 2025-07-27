<script setup lang="ts">
/**
 * MCPHeader Component.
 *
 * Displays the main header for the MCP collection page including title,
 * description, and metadata stats. Follows the playbooks.com header design
 * with clean typography and descriptive content.
 *
 * @component
 * @example
 * ```vue
 * <MCPHeader :total-mcps="142" />
 * ```
 */

interface Props {
  /** Total number of MCP servers available. */
  totalMCPs?: number
}

const _props = withDefaults(defineProps<Props>(), {
  totalMCPs: 0,
})

/**
 * Format the total number with commas for readability.
 */
const formattedTotal = computed(() => {
  if (_props.totalMCPs === undefined || _props.totalMCPs === null) {
    return '0'
  }

  // Add commas for thousands
  return _props.totalMCPs.toLocaleString()
})
</script>

<template>
  <header
    class="mcp-header bg-white dark:bg-zinc-900 border-b
    border-zinc-200 dark:border-zinc-700"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="py-8 lg:py-12">
        <!-- Main Heading -->
        <h1 class="text-3xl lg:text-4xl font-bold text-zinc-900 dark:text-white leading-tight mb-4">
          Find MCP servers to give AI agents superpowers
        </h1>

        <!-- Description -->
        <p class="text-lg text-zinc-600 dark:text-zinc-400 max-w-3xl leading-relaxed mb-6">
          Search through MCP servers and add them to Claude Desktop, Windsurf, and
          other AI agents using the Model Context Protocol.
        </p>

        <!-- Stats and Metadata -->
        <div class="flex items-center gap-6 text-sm text-zinc-500 dark:text-zinc-400">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-server-stack" class="w-4 h-4" />
            <span>{{ formattedTotal }} MCP servers available</span>
          </div>

          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-users" class="w-4 h-4" />
            <span>Community driven</span>
          </div>

          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-code-bracket" class="w-4 h-4" />
            <span>Open source</span>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.mcp-header {
  @apply relative;
}

/* Ensure text remains readable on all backgrounds */
.mcp-header h1 {
  @apply text-zinc-900 dark:text-white;
}

.mcp-header p {
  @apply text-zinc-600 dark:text-zinc-400;
}
</style>
