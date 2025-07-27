<script setup lang="ts">
const rulesItems = [
  [{
    label: 'SERP',
    to: 'https://serp.co',
  }],
  [{
    label: 'SERP AI',
    to: 'https://serp.ai',
  }],
]
</script>

<template>
  <nav class="flex items-center space-x-6">
    <!-- Rules dropdown -->
    <UDropdown :items="rulesItems" :popper="{ placement: 'bottom-start' }">
      <UButton variant="ghost" trailing-icon="i-heroicons-chevron-down-20-solid" class="nav-link">
        Rules
      </UButton>
    </UDropdown>

    <NuxtLink to="/" class="nav-link">
      MCPs
    </NuxtLink>
  </nav>
</template>
