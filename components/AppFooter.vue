<script setup lang="ts">
// Footer component with links and attribution
const appConfig = useAppConfig()
</script>

<template>
  <footer class="border-t border-zinc-200 py-8 mt-auto">
    <div class="max-w-6xl mx-auto px-5">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <!-- About Section -->
        <div>
          <h3 class="font-semibold text-zinc-900 mb-3">About</h3>
          <ul class="space-y-2 text-sm text-zinc-600">
            <li>
              <NuxtLink to="/about" class="hover:text-zinc-900 transition-colors">
                About
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Boxing Links -->
        <div>
          <h3 class="font-semibold text-zinc-900 mb-3">Boxing</h3>
          <ul class="space-y-2 text-sm text-zinc-600">
            <li>
              <NuxtLink to="/boxers" class="hover:text-zinc-900 transition-colors">
                Boxers
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/divisions" class="hover:text-zinc-900 transition-colors">
                Divisions
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Popular Divisions -->
        <div>
          <h3 class="font-semibold text-zinc-900 mb-3">Socials</h3>
          <ul class="space-y-2 text-sm text-zinc-600">
            <li>
              <NuxtLink to="https://serp.ly/@boxingundefeated/instagram" class="hover:text-zinc-900 transition-colors">
                Instagram
              </NuxtLink>
            </li>
            <li>
             <NuxtLink to="https://serp.ly/@boxingundefeated/youtube" class="hover:text-zinc-900 transition-colors">
                Youtube
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="https://serp.ly/@boxingundefeated/github" class="hover:text-zinc-900 transition-colors">
                Github
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Legal -->
        <div>
          <h3 class="font-semibold text-zinc-900 mb-3">Legal</h3>
          <ul class="space-y-2 text-sm text-zinc-600">
            <li>
              <NuxtLink to="/legal/privacy-policy" class="hover:text-zinc-900 transition-colors">
                Privacy Policy
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/legal/terms-conditions" class="hover:text-zinc-900 transition-colors">
                Terms & Conditions
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/legal/dmca" class="hover:text-zinc-900 transition-colors">
                DMCA
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/legal/affiliate-disclosure" class="hover:text-zinc-900 transition-colors">
                Affiliate Disclosure
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>

      <div class="border-t border-zinc-200 pt-8 text-center text-sm text-zinc-600">
        <p>{{ appConfig.site.copyright }}</p>
      </div>
    </div>
  </footer>
</template>
