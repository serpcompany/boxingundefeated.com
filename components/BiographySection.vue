<script setup lang="ts">
import type { Boxer } from '~/types'

interface Props {
  boxer: Boxer
}

const props = defineProps<Props>()
</script>

<template>
  <div v-if="boxer.bio || boxer.bio" id="biography" class="space-y-8">
    <!-- Short Bio Summary -->
    <div v-if="boxer.bio">
      <h2 class="text-2xl font-bold text-zinc-900 mb-4">About</h2>
      <BioContent :content="boxer.bio" />
    </div>
    
    <!-- Detailed Bio Sections -->
    <div v-if="boxer.bio" class="space-y-8">
      <div 
        v-for="(section, key) in boxer.bio" 
        :key="key"
        :id="`bio-${key}`" 
      >
        <h3 class="text-xl font-semibold text-zinc-900 mb-3">{{ section.title }}</h3>
        <BioContent :content="section.content" />
      </div>
    </div>
  </div>
</template>