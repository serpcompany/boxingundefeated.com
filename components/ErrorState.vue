<script setup lang="ts">
interface Props {
  title?: string
  message?: string
  linkText?: string
  linkTo?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Not Found',
  message: 'The requested resource could not be found.',
  linkText: '← Go Back',
  linkTo: '/'
})
</script>

<template>
  <div class="min-h-screen bg-white flex items-center justify-center">
    <div class="text-center">
      <h1 class="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
        {{ title }}
      </h1>
      <p class="text-zinc-600 dark:text-zinc-400 mb-4">
        {{ message }}
      </p>
      <NuxtLink 
        :to="linkTo" 
        class="text-red-600 hover:text-red-700 dark:text-red-400"
      >
        {{ linkText }}
      </NuxtLink>
    </div>
  </div>
</template>