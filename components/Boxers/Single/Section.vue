<script setup lang="ts">
  interface BoxersSingleSectionProps {
    title: string
  }

  defineProps<BoxersSingleSectionProps>()
</script>

<template>
  <section class="relative isolate">
    <UContainer class="flex flex-col gap-6 py-16">
      <h2
        class="text-3xl text-pretty tracking-tight font-semibold text-highlighted text-left"
      >
        {{ title }}
      </h2>
      <slot />
    </UContainer>
  </section>
</template>
