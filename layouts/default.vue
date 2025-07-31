<script setup lang="ts">
// Default layout for most pages
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-zinc-900">
    <LayoutAppHeader />
    <main class="flex-1">
      <slot />
    </main>
    <LayoutAppFooter />
  </div>
</template>
