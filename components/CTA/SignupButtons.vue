<script setup>
// Signup buttons with primary CTA and future OAuth integration
</script>

<template>
  <div class="button-container flex flex-col items-center space-y-4">
    <UButton
      size="lg"
      class="px-8"
      color="primary"
    >
      Go to dashboard
      <UIcon name="i-heroicons-arrow-right" class="ml-2" />
    </UButton>

    <!-- Future: OAuth buttons -->
    <div class="text-sm text-zinc-400">
      More signup options coming soon
    </div>
  </div>
</template>
