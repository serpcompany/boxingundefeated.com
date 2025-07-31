<script setup lang="ts">
interface Props {
  title: string
  subtitle?: string
  variant?: 'default' | 'compact'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default'
})

const paddingClasses = computed(() => {
  return props.variant === 'compact' 
    ? 'py-8 sm:py-12' 
    : 'py-8 sm:py-12 md:py-16'
})
</script>

<template>
  <div class="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
    <div :class="['max-w-7xl mx-auto px-4 sm:px-6 lg:px-8', paddingClasses]">
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