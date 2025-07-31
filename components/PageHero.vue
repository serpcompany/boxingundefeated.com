<script setup lang="ts">
interface Props {
  title: string
  subtitle?: string
}

const props = defineProps<Props>()
</script>

<template>
  <div class="bg-white border-b border-zinc-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16 w-full min-h-[200px] sm:min-h-[240px] flex flex-col justify-center">
      <slot name="before" />
      
      <h1 class="text-3xl sm:text-4xl font-bold mb-4 text-zinc-900 dark:text-white">
        {{ title }}
      </h1>
      
      <p v-if="subtitle" class="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400">
        {{ subtitle }}
      </p>
      
      <slot name="after" />
      <slot />
    </div>
  </div>
</template>