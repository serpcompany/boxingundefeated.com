<script setup lang="ts">
export interface BreadCrumbsItem {
  label: string
  to?: string
}

interface Props {
  items: BreadCrumbsItem[]
}

const props = defineProps<Props>()
</script>

<template>
  <nav class="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
    <template v-for="(item, index) in items" :key="index">
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
      <span v-if="index < items.length - 1" class="text-zinc-400 dark:text-zinc-600">
        /
      </span>
    </template>
  </nav>
</template>