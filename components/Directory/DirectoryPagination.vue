<script setup lang="ts">
interface Props {
  currentPage?: number
  totalPages?: number
  totalItems?: number
  itemsPerPage?: number
  itemsPerPageOptions?: number[]
  showItemsPerPage?: boolean
}

interface Emits {
  (e: 'pageChange', page: number): void
  (e: 'itemsPerPageChange', itemsPerPage: number): void
}

const props = withDefaults(defineProps<Props>(), {
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  itemsPerPage: 12,
  itemsPerPageOptions: () => [12, 24, 48, 96],
  showItemsPerPage: true,
})

const emit = defineEmits<Emits>()

const startItem = computed(() => {
  return (props.currentPage - 1) * props.itemsPerPage + 1
})

const endItem = computed(() => {
  const end = props.currentPage * props.itemsPerPage
  return Math.min(end, props.totalItems)
})

const visiblePages = computed(() => {
  const pages: (number | string)[] = []
  const total = props.totalPages
  const current = props.currentPage

  if (total <= 7) {
    // Show all pages if total is 7 or less
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  }
  else {
    // Show pages with ellipsis logic
    pages.push(1)

    if (current <= 4) {
      // Current page is near the beginning
      for (let i = 2; i <= 5; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    }
    else if (current >= total - 3) {
      // Current page is near the end
      pages.push('...')
      for (let i = total - 4; i <= total; i++) {
        pages.push(i)
      }
    }
    else {
      // Current page is in the middle
      pages.push('...')
      for (let i = current - 1; i <= current + 1; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    }
  }

  return pages
})

function goToPage(page: number): void {
  if (page >= 1 && page <= props.totalPages && page !== props.currentPage) {
    emit('pageChange', page)
  }
}

function handleItemsPerPageChange(event: Event): void {
  const target = event.target as HTMLSelectElement
  const newItemsPerPage = Number.parseInt(target.value, 10)
  emit('itemsPerPageChange', newItemsPerPage)
}
</script>

<template>
  <nav
    class="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800
           px-4 py-3 sm:px-6"
    aria-label="Pagination"
  >
    <!-- Mobile pagination -->
    <div class="flex flex-1 justify-between sm:hidden">
      <button
        :disabled="currentPage <= 1"
        class="relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md"
        :class="[
          currentPage <= 1
            ? 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
            : `text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300
               dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700`,
        ]"
        @click="goToPage(currentPage - 1)"
      >
        Previous
      </button>
      <button
        :disabled="currentPage >= totalPages"
        class="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md"
        :class="[
          currentPage >= totalPages
            ? 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
            : `text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300
               dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700`,
        ]"
        @click="goToPage(currentPage + 1)"
      >
        Next
      </button>
    </div>

    <!-- Desktop pagination -->
    <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
      <!-- Results info -->
      <div>
        <p class="text-sm text-zinc-700 dark:text-zinc-300">
          Showing
          <span class="font-medium">{{ startItem }}</span>
          to
          <span class="font-medium">{{ endItem }}</span>
          of
          <span class="font-medium">{{ totalItems }}</span>
          results
        </p>
      </div>

      <!-- Page numbers -->
      <div>
        <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
          <!-- Previous button -->
          <button
            :disabled="currentPage <= 1"
            class="relative inline-flex items-center rounded-l-md px-2 py-2 text-zinc-400
                   ring-1 ring-inset ring-zinc-300 dark:ring-zinc-600"
            :class="[
              currentPage <= 1
                ? 'cursor-not-allowed bg-zinc-50 dark:bg-zinc-800'
                : `hover:bg-zinc-50 dark:hover:bg-zinc-700 focus:z-20 focus:outline-offset-0
                   bg-white dark:bg-zinc-800`,
            ]"
            @click="goToPage(currentPage - 1)"
          >
            <span class="sr-only">Previous</span>
            <UIcon name="i-heroicons-chevron-left" class="h-5 w-5" />
          </button>

          <!-- Page numbers -->
          <template v-for="page in visiblePages" :key="page">
            <button
              v-if="typeof page === 'number'"
              class="relative inline-flex items-center px-4 py-2 text-sm font-semibold"
              :class="[
                page === currentPage
                  ? `z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2
                     focus-visible:outline-offset-2 focus-visible:outline-blue-600`
                  : `text-zinc-900 dark:text-zinc-100 ring-1 ring-inset ring-zinc-300
                     dark:ring-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700
                     focus:z-20 focus:outline-offset-0 bg-white dark:bg-zinc-800`,
              ]"
              @click="goToPage(page)"
            >
              {{ page }}
            </button>
            <span
              v-else
              class="relative inline-flex items-center px-4 py-2 text-sm font-semibold
                     text-zinc-700 dark:text-zinc-300 ring-1 ring-inset ring-zinc-300
                     dark:ring-zinc-600 focus:outline-offset-0 bg-white dark:bg-zinc-800"
            >
              ...
            </span>
          </template>

          <!-- Next button -->
          <button
            :disabled="currentPage >= totalPages"
            class="relative inline-flex items-center rounded-r-md px-2 py-2 text-zinc-400
                   ring-1 ring-inset ring-zinc-300 dark:ring-zinc-600"
            :class="[
              currentPage >= totalPages
                ? 'cursor-not-allowed bg-zinc-50 dark:bg-zinc-800'
                : `hover:bg-zinc-50 dark:hover:bg-zinc-700 focus:z-20 focus:outline-offset-0
                   bg-white dark:bg-zinc-800`,
            ]"
            @click="goToPage(currentPage + 1)"
          >
            <span class="sr-only">Next</span>
            <UIcon name="i-heroicons-chevron-right" class="h-5 w-5" />
          </button>
        </nav>
      </div>
    </div>

    <!-- Items per page selector -->
    <div v-if="showItemsPerPage" class="hidden lg:flex lg:items-center lg:space-x-2 lg:ml-4">
      <label for="items-per-page" class="text-sm text-zinc-700 dark:text-zinc-300">
        Items per page:
        <select
          id="items-per-page"
          :value="itemsPerPage"
          class="
            ml-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800
            py-1 px-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-blue-500
            focus:outline-none focus:ring-1 focus:ring-blue-500
          "
          @change="handleItemsPerPageChange"
        >
          <option v-for="option in itemsPerPageOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </label>
    </div>
  </nav>
</template>
