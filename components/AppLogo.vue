<script setup lang="ts">
// Logo component with boxing glove icon
const appConfig = useAppConfig()
</script>

<template>
  <NuxtLink to="/" class="flex items-center space-x-2 text-lg font-bold">
    </div>
    <span class="text-zinc-900">{{ appConfig.site.name }}</span>
    <span class="text-zinc-900">
      <img src="/logo.svg" alt="Logo" class="h-8 w-8" />
    </span>
  </NuxtLink>
</template>
