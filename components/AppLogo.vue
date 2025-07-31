<script setup lang="ts">
// Logo component with boxing glove icon
const appConfig = useAppConfig()
</script>

<template>
  <NuxtLink to="/" class="flex items-center space-x-2 text-lg font-bold">
    <!-- Boxing glove icon -->
    <div class="text-red-600 dark:text-red-500">
    </div>
    <span class="text-zinc-900 dark:text-white">{{ appConfig.site.name }}</span>
  </NuxtLink>
</template>
