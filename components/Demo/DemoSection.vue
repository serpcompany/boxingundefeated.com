<script setup>
// Demo section showcasing the platform in action
</script>

<template>
  <section class="py-16 bg-zinc-50 dark:bg-zinc-900">
    <div class="max-w-6xl mx-auto px-5">
      <div class="demo-grid grid gap-12 lg:grid-cols-2 items-center">
        <!-- Demo Video/Image Column -->
        <div class="demo-image-col">
          <div
            class="demo-video relative bg-white dark:bg-zinc-800
                   rounded-lg shadow-lg overflow-hidden"
          >
            <NuxtImg
              src="/docs/reference/single.png"
              alt="Demo screenshot showing AI-powered app development"
              class="w-full h-auto"
              loading="lazy"
              width="600"
              height="400"
            />
            <div
              class="play-button absolute inset-0 flex items-center justify-center
                     bg-black bg-opacity-40 hover:bg-opacity-50 transition-all cursor-pointer"
            >
              <UIcon name="i-heroicons-play" class="w-16 h-16 text-white" />
            </div>
          </div>
        </div>

        <!-- Demo Content Column -->
        <div class="demo-content-col">
          <h2 class="text-3xl font-semibold mb-6">
            See it in action
          </h2>
          <p class="demo-description text-lg text-zinc-600 dark:text-zinc-400 mb-8">
            Watch how AI tools can help you build better applications faster,
            even if you're just starting your coding journey.
          </p>

          <ul class="feature-list space-y-4">
            <li class="feature-item flex items-center">
              <UIcon
                name="i-heroicons-check-circle"
                class="checkmark w-6 h-6 text-green-600 mr-3"
              />
              <span>Build full-stack applications with AI assistance</span>
            </li>
            <li class="feature-item flex items-center">
              <UIcon
                name="i-heroicons-check-circle"
                class="checkmark w-6 h-6 text-green-600 mr-3"
              />
              <span>Learn best practices through guided examples</span>
            </li>
            <li class="feature-item flex items-center">
              <UIcon
                name="i-heroicons-check-circle"
                class="checkmark w-6 h-6 text-green-600 mr-3"
              />
              <span>Deploy your apps to production confidently</span>
            </li>
            <li class="feature-item flex items-center">
              <UIcon
                name="i-heroicons-check-circle"
                class="checkmark w-6 h-6 text-green-600 mr-3"
              />
              <span>Join a community of AI-first developers</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>
