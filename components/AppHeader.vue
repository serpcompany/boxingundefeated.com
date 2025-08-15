<script setup lang="ts">
  import type { NavigationMenuItem, NavigationMenuChildItem } from '#ui/types'

  const isMobileMenuOpen = ref(false)

  const divisionsItems: NavigationMenuChildItem[] = [
    {
      label: 'All Divisions',
      to: '/divisions',
    },
    {
      label: 'Heavyweight',
      to: '/divisions/heavyweight',
    },
    {
      label: 'Cruiserweight',
      to: '/divisions/cruiserweight',
    },
    {
      label: 'Light Heavyweight',
      to: '/divisions/light-heavyweight',
    },
    {
      label: 'Middleweight',
      to: '/divisions/middleweight',
    },
    {
      label: 'Welterweight',
      to: '/divisions/welterweight',
    },
    {
      label: 'Lightweight',
      to: '/divisions/lightweight',
    },
  ]

  const items = computed<NavigationMenuItem[]>(() => [
    {
      label: 'Home',
      to: '/',
    },
    {
      label: 'Boxers',
      to: '/boxers',
    },
    {
      label: 'Divisions',
      to: '/divisions',
      children: divisionsItems,
    },
    {
      label: 'About',
      to: '/about',
    },
  ])
</script>

<template>
  <header class="sticky top-0 z-50 w-full bg-default border-b border-muted">
    <UContainer>
      <div class="flex h-16 items-center justify-between">
        <!-- Logo -->
        <div class="flex-shrink-0">
          <AppLogo />
        </div>

        <!-- Desktop Navigation -->
        <UNavigationMenu
          orientation="horizontal"
          class="hidden lg:block"
          variant="link"
          :items="items"
        />

        <!-- Right side items -->
        <div class="flex items-center">
          <div class="hidden lg:block">
            <UUser :avatar="{ icon: 'lucide:user' }" size="sm" />
          </div>

          <!-- Mobile menu button -->
          <div class="lg:hidden">
            <USlideover>
              <UButton
                icon="lucide:menu"
                color="neutral"
                variant="ghost"
                square
              />

              <template #body>
                <div>
                  <UNavigationMenu
                    orientation="vertical"
                    variant="pill"
                    :items="items"
                    :ui="{ list: 'space-y-1' }"
                  />
                </div>
              </template>
              <template #footer>
                <UUser
                  :avatar="{ icon: 'lucide:user' }"
                  size="sm"
                  class="ms-auto"
                />
              </template>
            </USlideover>
          </div>
        </div>
      </div>
    </UContainer>
  </header>
</template>
