<script setup lang="ts">
  interface BoxersSingleAboutProps {
    content: string
  }

  defineProps<BoxersSingleAboutProps>()
</script>

<template>
  <BoxersSingleSection id="about" title="About">
    <div v-html="content" class="prose" />
  </BoxersSingleSection>
</template>
