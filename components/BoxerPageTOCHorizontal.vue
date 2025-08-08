<script setup lang="ts">
import type { Boxer } from '~/types'

interface Props {
  boxer: Boxer
}

const props = defineProps<Props>()

// Build navigation items based on available content
const navigationItems = computed(() => {
  const items = []
  
  // Professional Record
  items.push({
    label: 'Record',
    to: '#professional-record'
  })
  
  // Fighter Information
  items.push({
    label: 'Stats',
    to: '#fighter-information'
  })
  
  // Biography (if available)
  if (props.boxer.bio) {
    items.push({
      label: 'About',
      to: '#about'
    })
  }
  
  // Fight History
  items.push({
    label: 'Fights',
    to: '#fight-history'
  })
  
  return items
})

</script>

<template>
  <nav class="sticky top-16 z-40 bg-white border-b border-zinc-200">
    <!-- Mobile Dropdown -->
    <div class="sm:hidden">
      <div class="px-4 py-3">
        <USelectMenu
          :options="navigationItems"
          option-attribute="label"
          value-attribute="to"
          placeholder="Jump to section"
          class="w-full"
        />
      </div>
    </div>
    
    <!-- Desktop Horizontal Nav -->
    <div class="hidden sm:block max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center gap-1 overflow-x-auto scrollbar-hide py-3">
        <ULink
          v-for="item in navigationItems"
          :key="item.to"
          :to="item.to"
          class="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-all text-zinc-500 hover:text-zinc-700"
        >
          {{ item.label }}
        </ULink>
      </div>
    </div>
  </nav>
</template>

<style scoped>
/* Hide scrollbar but keep functionality */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>