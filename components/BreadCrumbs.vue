<script setup lang="ts">
export interface BreadCrumbsItem {
  label: string
  to?: string
  icon?: string
}

interface Props {
  items: BreadCrumbsItem[]
  includeHome?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  includeHome: true
})

// Build the full breadcrumb trail
const breadcrumbItems = computed(() => {
  const items = [...props.items]
  
  // Add home link at the beginning if requested
  if (props.includeHome && items.length > 0) {
    items.unshift({
      label: 'Home',
      to: '/'
    })
  }
  
  return items
})
</script>

<template>
  <nav class="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
    <template v-for="(item, index) in breadcrumbItems" :key="index">
      <!-- Link item -->
      <NuxtLink 
        v-if="item.to" 
        :to="item.to"
        class="hover:text-zinc-900 dark:hover:text-white transition-colors"
      >
        {{ item.label }}
      </NuxtLink>
      
      <!-- Text item (last item) -->
      <span v-else class="text-zinc-900 dark:text-white">
        {{ item.label }}
      </span>
      
      <!-- Separator -->
      <span 
        v-if="index < breadcrumbItems.length - 1" 
        class="text-zinc-400 dark:text-zinc-600"
      >
        /
      </span>
    </template>
  </nav>
</template>