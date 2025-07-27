<script setup lang="ts">
interface Props {
  text: string
  subtitle?: string
}

withDefaults(defineProps<Props>(), {
  subtitle: undefined,
})
</script>

<template>
  <div class="section-heading text-center">
    <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-white mb-4">
      {{ text }}
    </h2>
    <p v-if="subtitle" class="text-lg text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto">
      {{ subtitle }}
    </p>
  </div>
</template>
