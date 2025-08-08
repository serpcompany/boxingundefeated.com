<script setup lang="ts">
import type { Boxer } from '~/types'

interface Props {
  boxer: Boxer
}

const props = defineProps<Props>()
</script>

<template>
  <div v-if="boxer.bio" id="about" class="space-y-8">
    <!-- Short Bio Summary -->
      <h2 class="text-2xl font-bold text-zinc-900 mb-4">About</h2>
      <BioContent :content="boxer.bio" />
  </div>
</template>