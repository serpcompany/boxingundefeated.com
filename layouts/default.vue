<script setup lang="ts">
  // Default layout for most pages
</script>

<template>
  <div class="min-h-screen flex flex-col bg-default">
    <AppHeader />

    <UMain>
      <slot />
    </UMain>

    <AppFooter class="mt-auto" />
  </div>
</template>
