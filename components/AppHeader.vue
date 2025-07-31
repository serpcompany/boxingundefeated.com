<script setup lang="ts">
const isMobileMenuOpen = ref(false)

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
  <header class="sticky top-0 z-50 w-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex h-16 items-center justify-between">
        <!-- Logo -->
        <div class="flex-shrink-0">
          <AppLogo />
        </div>

        <!-- Desktop Navigation -->
        <nav class="hidden lg:flex items-center space-x-6">
          <NuxtLink to="/" class="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white transition-colors">
            Home
          </NuxtLink>

          <NuxtLink to="/boxers" class="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white transition-colors">
            Boxers
          </NuxtLink>

          <UDropdown :items="divisionsItems" :popper="{ placement: 'bottom-start' }">
            <UButton 
              variant="ghost" 
              trailing-icon="i-heroicons-chevron-down-20-solid" 
              class="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
            >
              Divisions
            </UButton>
          </UDropdown>

          <NuxtLink to="/about" class="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white transition-colors">
            About
          </NuxtLink>
        </nav>

        <!-- Right side items -->
        <div class="flex items-center">
          <div class="hidden lg:block">
            <UserProfile />
          </div>

          <!-- Mobile menu button -->
          <div class="lg:hidden">
            <UButton 
              @click="isMobileMenuOpen = !isMobileMenuOpen"
              variant="ghost"
              square
              :icon="isMobileMenuOpen ? 'i-heroicons-x-mark' : 'i-heroicons-bars-3'"
            />
          </div>
        </div>
      </div>

      <!-- Mobile Navigation -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <nav v-show="isMobileMenuOpen" class="lg:hidden pb-4">
          <div class="space-y-1">
            <NuxtLink 
              to="/" 
              class="block px-3 py-2 text-base font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-800 rounded-md"
              @click="isMobileMenuOpen = false"
            >
              Home
            </NuxtLink>

            <NuxtLink 
              to="/boxers" 
              class="block px-3 py-2 text-base font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-800 rounded-md"
              @click="isMobileMenuOpen = false"
            >
              Boxers
            </NuxtLink>

            <NuxtLink 
              to="/divisions" 
              class="block px-3 py-2 text-base font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-800 rounded-md"
              @click="isMobileMenuOpen = false"
            >
              All Divisions
            </NuxtLink>

            <NuxtLink 
              to="/about" 
              class="block px-3 py-2 text-base font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-800 rounded-md"
              @click="isMobileMenuOpen = false"
            >
              About
            </NuxtLink>
          </div>

          <div class="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <UserProfile />
          </div>
        </nav>
      </Transition>
    </div>
  </header>
</template>
