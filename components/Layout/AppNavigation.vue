<script setup lang="ts">
const divisionsItems = [
  [{
    label: 'All Divisions',
    to: '/divisions',
  }],
  [{
    label: 'Heavyweight',
    to: '/divisions/heavyweight',
  }],
  [{
    label: 'Cruiserweight',
    to: '/divisions/cruiserweight',
  }],
  [{
    label: 'Light Heavyweight',
    to: '/divisions/light-heavyweight',
  }],
  [{
    label: 'Middleweight',
    to: '/divisions/middleweight',
  }],
  [{
    label: 'Welterweight',
    to: '/divisions/welterweight',
  }],
  [{
    label: 'Lightweight',
    to: '/divisions/lightweight',
  }],
]
</script>

<template>
  <nav class="flex items-center space-x-6">
    <NuxtLink to="/" class="nav-link">
      Home
    </NuxtLink>

    <NuxtLink to="/boxers" class="nav-link">
      Boxers
    </NuxtLink>

    <!-- Divisions dropdown -->
    <UDropdown :items="divisionsItems" :popper="{ placement: 'bottom-start' }">
      <UButton variant="ghost" trailing-icon="i-heroicons-chevron-down-20-solid" class="nav-link">
        Divisions
      </UButton>
    </UDropdown>

    <NuxtLink to="/about" class="nav-link">
      About
    </NuxtLink>
  </nav>
</template>
