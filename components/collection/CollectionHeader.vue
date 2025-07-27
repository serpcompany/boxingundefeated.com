<script setup lang="ts">
/**
 * CollectionHeader Component.
 *
 * Unified header component for collection pages that provides better styling
 * and layout compared to the generic DirectoryHeader. Based on the superior
 * MCP header design with enhanced typography and metadata display.
 *
 * @component
 * @example
 * ```vue
 * <CollectionHeader
 *   title="Browse Playbooks"
 *   description="Discover AI rules and tutorials"
 *   :total-items="142"
 *   collection-type="playbooks"
 * />
 * ```
 */

interface Props {
  /** Main title for the collection page. */
  title?: string
  /** Description text below the title. */
  description?: string
  /** Total number of items in the collection. */
  totalItems?: number
  /** Type of collection for stats display. */
  collectionType?: 'playbooks' | 'mcps' | 'rules' | 'tools'
  /** Show community-driven badge. */
  showCommunity?: boolean
  /** Show open source badge. */
  showOpenSource?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Collection',
  description: 'Browse and discover amazing content',
  totalItems: 0,
  collectionType: 'playbooks',
  showCommunity: true,
  showOpenSource: true,
})

/**
 * Format the total number with commas for readability.
 */
const formattedTotal = computed(() => {
  if (props.totalItems === undefined || props.totalItems === null) {
    return '0'
  }
  return props.totalItems.toLocaleString()
})

/**
 * Get the appropriate icon for the collection type.
 */
const collectionIcon = computed(() => {
  switch (props.collectionType) {
    case 'mcps':
      return 'i-heroicons-server-stack'
    case 'rules':
      return 'i-heroicons-document-text'
    case 'tools':
      return 'i-heroicons-wrench-screwdriver'
    case 'playbooks':
    default:
      return 'i-heroicons-book-open'
  }
})

/**
 * Get the appropriate label for the collection type.
 */
const collectionLabel = computed(() => {
  switch (props.collectionType) {
    case 'mcps':
      return 'MCP servers available'
    case 'rules':
      return 'rules available'
    case 'tools':
      return 'tools available'
    case 'playbooks':
    default:
      return 'playbooks available'
  }
})
</script>

<template>
  <header
    class="relative bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-800
    border-b border-zinc-200 dark:border-zinc-700"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="py-16 lg:py-20">
        <!-- Main Heading -->
        <div class="text-center lg:text-left mb-8">
          <h1
            class="text-4xl lg:text-5xl font-bold font-display text-zinc-900 dark:text-white
            leading-tight tracking-tight mb-6"
          >
            {{ title }}
          </h1>

          <!-- Description -->
          <p
            class="text-lg lg:text-xl text-zinc-600 dark:text-zinc-400 max-w-3xl leading-relaxed
            mx-auto lg:mx-0"
          >
            {{ description }}
          </p>
        </div>

        <!-- Enhanced Stats Row -->
        <div
          class="flex flex-wrap items-center justify-center lg:justify-start gap-6 lg:gap-8
          text-sm text-zinc-500 dark:text-zinc-400"
        >
          <div
            class="flex items-center gap-3 bg-white dark:bg-zinc-800 rounded-full px-4 py-2
            shadow-sm border border-zinc-200 dark:border-zinc-700"
          >
            <div
              class="flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900/30
              rounded-full"
            >
              <UIcon :name="collectionIcon" class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <span class="font-semibold text-zinc-900 dark:text-white">{{ formattedTotal }}</span>
            <span>{{ collectionLabel }}</span>
          </div>

          <div
            v-if="showCommunity"
            class="flex items-center gap-3 bg-white dark:bg-zinc-800
            rounded-full px-4 py-2 shadow-sm border border-zinc-200 dark:border-zinc-700"
          >
            <div
              class="flex items-center justify-center w-6 h-6 bg-green-100 dark:bg-green-900/30
              rounded-full"
            >
              <UIcon
                name="i-heroicons-users"
                class="w-3.5 h-3.5 text-green-600 dark:text-green-400"
              />
            </div>
            <span class="font-medium">Community driven</span>
          </div>

          <div
            v-if="showOpenSource"
            class="flex items-center gap-3 bg-white dark:bg-zinc-800
            rounded-full px-4 py-2 shadow-sm border border-zinc-200 dark:border-zinc-700"
          >
            <div
              class="flex items-center justify-center w-6 h-6 bg-purple-100 dark:bg-purple-900/30
              rounded-full"
            >
              <UIcon
                name="i-heroicons-code-bracket"
                class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400"
              />
            </div>
            <span class="font-medium">Open source</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Background decorative elements -->
    <div class="absolute inset-0 bg-grid-pattern opacity-5 dark:opacity-10" />
    <div
      class="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-gradient-to-br
      from-blue-400 to-purple-500 rounded-full opacity-10 blur-2xl"
    />
    <div
      class="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-gradient-to-br
      from-green-400 to-blue-500 rounded-full opacity-10 blur-xl"
    />
  </header>
</template>
