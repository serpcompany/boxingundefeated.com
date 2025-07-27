<script setup>
defineProps({
  strikethrough: {
    type: String,
    required: true,
  },
  headline: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <div class="bg-white dark:bg-zinc-800 rounded-lg p-6 border border-zinc-200 dark:border-zinc-700">
    <p class="strikethrough text-sm text-zinc-500 dark:text-zinc-400 line-through mb-3">
      {{ strikethrough }}
    </p>
    <h3 class="headline text-xl font-semibold text-zinc-900 dark:text-white mb-3">
      {{ headline }}
    </h3>
    <p class="description text-zinc-600 dark:text-zinc-400">
      {{ description }}
    </p>
  </div>
</template>
