<script setup>
// Community section with code sharing and help panel
</script>

<template>
  <section class="py-16 bg-white dark:bg-zinc-900">
    <div class="max-w-6xl mx-auto px-5">
      <h2 class="text-3xl font-semibold text-center mb-12">
        Get help from the community
      </h2>

      <div class="community-grid grid gap-8 lg:grid-cols-2">
        <!-- Editor Column -->
        <div class="editor-column">
          <div
            class="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-6
                   border border-zinc-200 dark:border-zinc-700"
          >
            <h3 class="text-lg font-semibold mb-4">
              Share your code
            </h3>
            <div class="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-sm">
              <div class="text-zinc-400 mb-2">
                // Ask for help with your code
              </div>
              <div class="text-blue-400">
                const
              </div>
              <div class="text-zinc-100 ml-2">
                myProject = {
              </div>
              <div class="text-zinc-100 ml-4">
                framework: <span class="text-green-400">'nuxt'</span>,
              </div>
              <div class="text-zinc-100 ml-4">
                issue: <span class="text-green-400">'need help with...'</span>
              </div>
              <div class="text-zinc-100 ml-2">
                }
              </div>
            </div>
            <UButton class="mt-4" variant="outline" block>
              Share & Get Help
            </UButton>
          </div>
        </div>

        <!-- Community Help Column -->
        <div class="help-column">
          <CommunityHelp />
        </div>
      </div>
    </div>
  </section>
</template>
