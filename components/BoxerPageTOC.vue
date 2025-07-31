<script setup lang="ts">
import type { Boxer } from '~/types/Boxing'

interface Props {
  boxer: Boxer
}

const props = defineProps<Props>()

// Build navigation items based on available content
const navigationItems = computed(() => {
  const items = []
  
  // Professional Record
  items.push({
    label: 'Professional Record',
    to: '#professional-record'
  })
  
  // Amateur Record (if available)
  if (props.boxer.amateur_total_bouts && props.boxer.amateur_total_bouts > 0) {
    items.push({
      label: 'Amateur Record',
      to: '#amateur-record'
    })
  }
  
  // Fighter Information
  items.push({
    label: 'Fighter Information',
    to: '#fighter-information'
  })
  
  // Biography (if available)
  if (props.boxer.bio || props.boxer.bioSections) {
    items.push({
      label: 'Biography',
      to: '#biography'
    })
    
    // Add sub-sections for detailed bio
    if (props.boxer.bioSections) {
      const bioSubItems = []
      for (const [key, section] of Object.entries(props.boxer.bioSections)) {
        bioSubItems.push({
          label: section.title,
          to: `#bio-${key}`
        })
      }
      items[items.length - 1].children = bioSubItems
    }
  }
  
  // Fight History
  items.push({
    label: 'Fight History',
    to: '#fight-history'
  })
  
  return items
})

// Navigation UI configuration
const navigationUI = computed(() => ({
  wrapper: 'border-l border-zinc-200 dark:border-zinc-800',
  base: 'group block border-l -ml-px lg:leading-6 before:hidden',
  padding: 'p-0 pl-4',
  rounded: '',
  font: 'font-normal',
  ring: '',
  active: 'text-primary-500 dark:text-primary-400 border-current font-medium',
  inactive: 'border-transparent hover:border-zinc-400 dark:hover:border-zinc-500 text-zinc-700 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-300'
}))
</script>

<template>
  <nav class="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
    <h3 class="text-sm font-semibold text-zinc-900 dark:text-white mb-3">
      On this page
    </h3>
    <UVerticalNavigation
      :links="navigationItems"
      :ui="navigationUI"
    />
  </nav>
</template>