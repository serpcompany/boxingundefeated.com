<script setup>
// Header component with three-section layout matching original
</script>

<template>
  <header class="h-14 border-b border-zinc-200 dark:border-zinc-800">
    <div class="max-w-7xl mx-auto px-5 h-full">
      <div class="flex items-center justify-between h-full">
        <!-- Logo Section -->
        <div class="grow basis-0">
          <LayoutAppLogo />
        </div>

        <!-- Navigation Section -->
        <div class="flex items-center justify-center">
          <LayoutAppNavigation />
        </div>

        <!-- User Section -->
        <div class="grow basis-0 flex justify-end">
          <LayoutUserProfile />
        </div>
      </div>
    </div>
  </header>
</template>
