<script setup>
// Logo component with boxing glove icon
const appConfig = useAppConfig()
</script>

<template>
  <NuxtLink to="/" class="flex items-center space-x-2 text-lg font-bold">
    <!-- Boxing glove icon -->
    <div class="text-red-600 dark:text-red-500">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 16V6C19 3.24 16.76 1 14 1H10C7.24 1 5 3.24 5 6V16C5 17.86 6.28 19.42 8 19.87V21C8 22.1 8.9 23 10 23H14C15.1 23 16 22.1 16 21V19.87C17.72 19.42 19 17.86 19 16ZM12 13C10.34 13 9 11.66 9 10S10.34 7 12 7S15 8.34 15 10S13.66 13 12 13Z"/>
      </svg>
    </div>
    <span class="text-zinc-900 dark:text-white">{{ appConfig.brand.name }}</span>
  </NuxtLink>
</template>
