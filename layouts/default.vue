<script setup lang="ts">
// Default layout for most pages
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-zinc-900">
    <AppHeader />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
