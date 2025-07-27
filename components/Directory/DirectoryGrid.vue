<script setup lang="ts">
/**
 * Represents a directory item that can be displayed in a grid or list view.
 * This interface is designed to be flexible for different types of content
 * (playbooks, MCP tools, etc.).
 *
 * @interface DirectoryItem
 * @example
 * ```typescript
 * const playbookItem: DirectoryItem = {
 *   id: 'playbook-123',
 *   title: 'React Best Practices',
 *   description: 'Comprehensive guide to React development patterns',
 *   category: 'Frontend',
 *   tags: ['react', 'javascript', 'frontend'],
 *   likes: 125,
 *   views: 1500,
 *   featured: true,
 *   updatedAt: '2024-01-15T10:30:00Z',
 *   author: { name: 'John Doe', avatar: '/avatars/john.jpg' }
 * }
 * ```
 */
interface DirectoryItem {
  id: string
  title: string
  description: string
  category: string
  tags: string[]
  likes: number
  views: number
  featured?: boolean
  updatedAt: string
  author?: {
    name: string
    avatar?: string
  }
}

/**
 * Component props for DirectoryGrid.
 *
 * @interface Props
 */
interface Props {
  items?: DirectoryItem[]
  viewMode?: 'grid' | 'list'
  loading?: boolean
}

/**
 * Component events for DirectoryGrid.
 *
 * @interface Emits
 */
interface Emits {
  /** Emitted when a directory item is clicked. */
  (e: 'itemClick', item: DirectoryItem): void
}

withDefaults(defineProps<Props>(), {
  items: () => [],
  viewMode: 'grid',
  loading: false,
})

defineEmits<Emits>()

/**
 * Formats a number with appropriate unit suffix (k, M).
 *
 * @param count - The number to format.
 * @returns Formatted string with unit suffix.
 * @example
 * ```typescript
 * formatCount(1500) // "1.5k"
 * formatCount(2500000) // "2.5M"
 * formatCount(42) // "42"
 * ```
 */
function formatCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  }
  else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`
  }
  return count.toString()
}

/**
 * Formats a date string to relative time (e.g., "2 days ago").
 *
 * @param dateString - ISO date string to format.
 * @returns Human-readable relative time string.
 * @example
 * ```typescript
 * formatDate('2024-01-15T10:30:00Z') // "3 days ago"
 * ```
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 1) {
    return '1 day ago'
  }
  else if (diffDays < 7) {
    return `${diffDays} days ago`
  }
  else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`
  }
  else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return `${months} month${months > 1 ? 's' : ''} ago`
  }
  else {
    const years = Math.floor(diffDays / 365)
    return `${years} year${years > 1 ? 's' : ''} ago`
  }
}
</script>

<template>
  <div class="directory-grid">
    <!-- Grid layout -->
    <div
      v-if="viewMode === 'grid'"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="
          group bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200
          dark:border-zinc-700 p-6
          hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-600
          transition-all duration-200
          cursor-pointer text-left w-full focus:outline-none focus:ring-2 focus:ring-blue-500
          focus:ring-offset-2 dark:focus:ring-offset-zinc-900
        "
        :aria-label="`View details for ${item.title}`"
        @click="$emit('itemClick', item)"
        @keydown.enter="$emit('itemClick', item)"
        @keydown.space.prevent="$emit('itemClick', item)"
      >
        <!-- Item header -->
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1">
            <h3
              class="text-lg font-semibold text-zinc-900 dark:text-white
                     group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
            >
              {{ item.title }}
            </h3>
            <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              {{ item.category }}
            </p>
          </div>
          <UIcon
            v-if="item.featured"
            name="i-heroicons-star-solid"
            class="w-5 h-5 text-yellow-500"
          />
        </div>

        <!-- Description -->
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-3">
          {{ item.description }}
        </p>

        <!-- Tags -->
        <div class="flex flex-wrap gap-2 mb-4">
          <span
            v-for="tag in item.tags?.slice(0, 3)"
            :key="tag"
            class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium
                   bg-zinc-100 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
          >
            {{ tag }}
          </span>
          <span
            v-if="item.tags && item.tags.length > 3"
            class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium
                   bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
          >
            +{{ item.tags.length - 3 }}
          </span>
        </div>

        <!-- Footer stats -->
        <div class="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-1">
              <UIcon name="i-heroicons-heart" class="w-4 h-4" />
              <span>{{ formatCount(item.likes) }}</span>
            </div>
            <div class="flex items-center space-x-1">
              <UIcon name="i-heroicons-eye" class="w-4 h-4" />
              <span>{{ formatCount(item.views) }}</span>
            </div>
          </div>
          <time class="text-xs" :datetime="item.updatedAt">
            {{ formatDate(item.updatedAt) }}
          </time>
        </div>
      </button>
    </div>

    <!-- List layout -->
    <div
      v-else-if="viewMode === 'list'"
      class="space-y-4"
    >
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="
          group bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200
          dark:border-zinc-700 p-6
          hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-600
          transition-all duration-200
          cursor-pointer text-left w-full focus:outline-none focus:ring-2 focus:ring-blue-500
          focus:ring-offset-2 dark:focus:ring-offset-zinc-900
        "
        :aria-label="`View details for ${item.title}`"
        @click="$emit('itemClick', item)"
        @keydown.enter="$emit('itemClick', item)"
        @keydown.space.prevent="$emit('itemClick', item)"
      >
        <div class="flex items-start justify-between">
          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center space-x-3 mb-2">
              <h3
                class="text-lg font-semibold text-zinc-900 dark:text-white
                       group-hover:text-blue-600 dark:group-hover:text-blue-400
                       transition-colors truncate"
              >
                {{ item.title }}
              </h3>
              <UIcon
                v-if="item.featured"
                name="i-heroicons-star-solid"
                class="w-4 h-4 text-yellow-500 flex-shrink-0"
              />
            </div>

            <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-2">
              {{ item.description }}
            </p>

            <div class="flex items-center justify-between">
              <!-- Tags and category -->
              <div class="flex items-center space-x-4">
                <span class="text-sm text-zinc-500 dark:text-zinc-400">
                  {{ item.category }}
                </span>
                <div class="flex space-x-2">
                  <span
                    v-for="tag in item.tags?.slice(0, 2)"
                    :key="tag"
                    class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium
                           bg-zinc-100 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>

              <!-- Stats -->
              <div class="flex items-center space-x-6 text-sm text-zinc-500 dark:text-zinc-400">
                <div class="flex items-center space-x-1">
                  <UIcon name="i-heroicons-heart" class="w-4 h-4" />
                  <span>{{ formatCount(item.likes) }}</span>
                </div>
                <div class="flex items-center space-x-1">
                  <UIcon name="i-heroicons-eye" class="w-4 h-4" />
                  <span>{{ formatCount(item.views) }}</span>
                </div>
                <time class="text-xs" :datetime="item.updatedAt">
                  {{ formatDate(item.updatedAt) }}
                </time>
              </div>
            </div>
          </div>
        </div>
      </button>
    </div>

    <!-- Empty state -->
    <div
      v-if="!items || items.length === 0"
      class="text-center py-12"
    >
      <UIcon
        name="i-heroicons-document-magnifying-glass"
        class="mx-auto w-12 h-12 text-zinc-400 mb-4"
      />
      <h3 class="text-lg font-medium text-zinc-900 dark:text-white mb-2">
        No results found
      </h3>
      <p class="text-zinc-600 dark:text-zinc-400">
        Try adjusting your search or filter criteria
      </p>
    </div>

    <!-- Loading state -->
    <div
      v-if="loading"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      <div
        v-for="n in 8"
        :key="n"
        class="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200
               dark:border-zinc-700 p-6 animate-pulse"
      >
        <div class="space-y-4">
          <div class="h-5 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4" />
          <div class="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2" />
          <div class="space-y-2">
            <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded" />
            <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-2/3" />
          </div>
          <div class="flex space-x-2">
            <div class="h-6 w-16 bg-zinc-200 dark:bg-zinc-700 rounded" />
            <div class="h-6 w-20 bg-zinc-200 dark:bg-zinc-700 rounded" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
