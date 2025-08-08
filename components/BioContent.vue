<script setup lang="ts">
interface Props {
  content?: string | null
}

const props = defineProps<Props>()
const { $sanitize } = useNuxtApp()

const sanitizedContent = computed(() => {
  if (!props.content) return ''
  return $sanitize(props.content)
})
</script>

<template>
  <div 
    v-if="sanitizedContent"
    v-html="sanitizedContent"
    class="bio-content"
  />
  <div v-else class="text-zinc-500 italic">
    
  </div>
</template>

<style scoped>
.bio-content {
  @apply text-zinc-700 leading-relaxed;
}

.bio-content :deep(p) {
  @apply mb-4 text-zinc-700;
}

.bio-content :deep(h1) {
  @apply text-2xl font-semibold text-zinc-900 mb-4;
}

.bio-content :deep(h2) {
  @apply text-xl font-semibold text-zinc-900 mb-3;
}

.bio-content :deep(h3) {
  @apply text-lg font-semibold text-zinc-900 mb-2;
}

.bio-content :deep(h4) {
  @apply text-base font-semibold text-zinc-900 mb-2;
}

.bio-content :deep(strong) {
  @apply font-semibold text-zinc-900;
}

.bio-content :deep(em) {
  @apply italic;
}

.bio-content :deep(a) {
  @apply text-primary-600 underline hover:text-primary-700;
}

.bio-content :deep(ul) {
  @apply list-disc list-inside mb-4 space-y-1;
}

.bio-content :deep(ol) {
  @apply list-decimal list-inside mb-4 space-y-1;
}

.bio-content :deep(li) {
  @apply text-zinc-700;
}

.bio-content :deep(blockquote) {
  @apply border-l-4 border-zinc-300 pl-4 italic text-zinc-600 my-4;
}
</style>