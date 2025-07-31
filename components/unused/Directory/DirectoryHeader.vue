<script setup lang="ts">
interface Props {
  title?: string
  description?: string
  resultsCount?: number
  viewMode?: 'grid' | 'list'
}

interface Emits {
  (e: 'toggleSidebar'): void
  (e: 'viewChange', mode: 'grid' | 'list'): void
}

withDefaults(defineProps<Props>(), {
  title: 'Directory',
  description: 'Browse and discover amazing projects and tools',
  resultsCount: 0,
  viewMode: 'grid',
})

defineEmits<Emits>()
</script>

<template>
  <header class="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
    <div class="px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Mobile menu button -->
        <button
          class="lg:hidden p-2 rounded-md text-zinc-600 dark:text-zinc-400
                 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
          @click="$emit('toggleSidebar')"
        >
          <UIcon name="i-heroicons-bars-3" class="w-6 h-6" />
        </button>

        <!-- Breadcrumbs -->
        <nav class="flex items-center space-x-2 text-sm">
          <NuxtLink
            to="/"
            class="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          >
            Home
          </NuxtLink>
          <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-zinc-400" />
          <span class="text-zinc-900 dark:text-white font-medium">{{ title }}</span>
        </nav>

        <!-- Actions -->
        <div class="flex items-center space-x-4">
          <!-- View toggle -->
          <div
            class="hidden sm:flex items-center space-x-1 bg-zinc-100 dark:bg-zinc-800
                   rounded-lg p-1"
          >
            <button
              class="p-2 rounded-md text-sm font-medium transition-colors"
              :class="[
                viewMode === 'grid'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white',
              ]"
              @click="$emit('viewChange', 'grid')"
            >
              <UIcon name="i-heroicons-squares-2x2" class="w-4 h-4" />
            </button>
            <button
              class="p-2 rounded-md text-sm font-medium transition-colors"
              :class="[
                viewMode === 'list'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white',
              ]"
              @click="$emit('viewChange', 'list')"
            >
              <UIcon name="i-heroicons-list-bullet" class="w-4 h-4" />
            </button>
          </div>

          <!-- Results count -->
          <div class="text-sm text-zinc-600 dark:text-zinc-400">
            {{ resultsCount }} {{ resultsCount === 1 ? 'result' : 'results' }}
          </div>
        </div>
      </div>

      <!-- Page title and description -->
      <div class="pb-6">
        <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">
          {{ title }}
        </h1>
        <p v-if="description" class="mt-2 text-zinc-600 dark:text-zinc-400">
          {{ description }}
        </p>
      </div>
    </div>
  </header>
</template>
