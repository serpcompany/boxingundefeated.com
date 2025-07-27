<script setup>
// Footer component with links and attribution
const appConfig = useAppConfig()
</script>

<template>
  <footer class="border-t border-zinc-200 dark:border-zinc-800 py-8">
    <div class="max-w-7xl mx-auto px-5">
      <div class="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
        <div class="flex items-center space-x-6">
          <NuxtLink
            to="/privacy"
            class="hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            Privacy Policy
          </NuxtLink>
          <NuxtLink to="/terms" class="hover:text-zinc-900 dark:hover:text-white transition-colors">
            Terms of Service
          </NuxtLink>
        </div>
        <div>
          © 2025 {{ appConfig.brand.name }}. All rights reserved.
        </div>
      </div>
    </div>
  </footer>
</template>
