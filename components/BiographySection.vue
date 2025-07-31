<script setup lang="ts">
import type { Boxer } from '~/types/Boxing'

interface Props {
  boxer: Boxer
}

const props = defineProps<Props>()

// Format bio content with basic markdown support
function formatBioContent(content: string): string {
  // Convert **bold** to <strong>
  let formatted = content.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-zinc-900 dark:text-white">$1</strong>')
  
  // Convert line breaks to <br> for paragraphs
  formatted = formatted.replace(/\n\n/g, '</p><p class="mb-4 text-zinc-600 dark:text-zinc-400">')
  
  // Convert bullet points
  formatted = formatted.replace(/• /g, '<span class="inline-block w-2 h-2 bg-zinc-400 dark:bg-zinc-600 rounded-full mr-2 mb-1"></span>')
  
  // Wrap in paragraph tags
  formatted = `<p class="mb-4 text-zinc-600 dark:text-zinc-400">${formatted}</p>`
  
  return formatted
}
</script>

<template>
  <div v-if="boxer.bio || boxer.bioSections" class="space-y-8">
    <!-- Short Bio Summary -->
    <div v-if="boxer.bio">
      <h2 class="text-2xl font-bold text-zinc-900 dark:text-white mb-4">Biography</h2>
      <p class="text-zinc-700 dark:text-zinc-300 leading-relaxed text-lg">{{ boxer.bio }}</p>
    </div>
    
    <!-- Detailed Bio Sections -->
    <div v-if="boxer.bioSections" class="space-y-8">
      <div 
        v-for="(section, key) in boxer.bioSections" 
        :key="key" 
        class="prose prose-zinc dark:prose-invert max-w-none"
      >
        <h3 class="text-xl font-semibold text-zinc-900 dark:text-white mb-3">{{ section.title }}</h3>
        <div 
          class="text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap" 
          v-html="formatBioContent(section.content)"
        ></div>
      </div>
    </div>
  </div>
</template>