<script setup lang="ts">
  // Default layout for most pages
</script>

<template>
  <div class="min-h-screen flex flex-col bg-default">
    <AppHeader />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter class="mt-auto" />
  </div>
</template>
