<script setup>
// User profile component with avatar and name
</script>

<template>
  <div class="flex items-center space-x-3">
    <!-- User avatar -->
    <UAvatar
      src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
      alt="Devin Schup"
      size="sm"
    />
    <!-- User name -->
    <span class="text-sm font-medium text-zinc-900 dark:text-white">
      Devin Schup
    </span>
  </div>
</template>
