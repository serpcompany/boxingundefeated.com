<script setup lang="ts">
  interface BoxersSingleAboutProps {
    content: string
  }

  defineProps<BoxersSingleAboutProps>()
</script>

<template>
  <BoxersSingleSection id="about" title="About">
    <div
      v-html="content"
      class="max-w-none prose prose-base prose-neutral dark:prose-invert"
    />
  </BoxersSingleSection>
</template>
