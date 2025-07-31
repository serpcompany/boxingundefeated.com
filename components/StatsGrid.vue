<script setup lang="ts">
interface Stat {
  label: string
  value: string | number
}

interface Props {
  title: string
  stats: Stat[]
}

const props = defineProps<Props>()
</script>

<template>
  <div :id="title.toLowerCase().replace(/\s+/g, '-')">
    <h2 class="text-lg font-semibold text-zinc-900 dark:text-white mb-4">{{ title }}</h2>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div 
        v-for="(stat, index) in stats" 
        :key="index"
        class="bg-white rounded-lg p-4 border border-zinc-200"
      >
        <div class="text-sm text-zinc-600 dark:text-zinc-400 mb-1">{{ stat.label }}</div>
        <div class="text-2xl font-semibold text-zinc-900 dark:text-white">{{ stat.value }}</div>
      </div>
    </div>
  </div>
</template>