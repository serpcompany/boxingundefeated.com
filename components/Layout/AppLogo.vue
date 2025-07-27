<script setup>
// Logo component with diamond icon and mono font
const appConfig = useAppConfig()
</script>

<template>
  <NuxtLink to="/" class="flex items-center space-x-2 text-lg font-mono">
    <!-- Diamond icon placeholder -->

    <span class="text-zinc-900 dark:text-white">{{ appConfig.brand.name }}</span>
  </NuxtLink>
</template>
