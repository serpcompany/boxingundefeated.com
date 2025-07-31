<script setup lang="ts">
interface Props {
  message?: string
}

const props = withDefaults(defineProps<Props>(), {
  message: 'Loading...'
})
</script>

<template>
  <div class="min-h-screen bg-white flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4" />
      <p class="text-zinc-600 dark:text-zinc-400">
        {{ message }}
      </p>
    </div>
  </div>
</template>