<script setup lang="ts">
  import type { Boxer } from '~/server/db/drizzle'

  interface BoxersSingleTocProps {
    boxer: Boxer
  }

  const props = defineProps<BoxersSingleTocProps>()

  const items = computed(() => {
    const sections = []

    // Professional Record
    sections.push({
      label: 'Record',
      to: '#professional-record',
    })

    // Fighter Information
    sections.push({
      label: 'Fighter Profile',
      to: '#fighter-profile',
    })

    // Biography (if available)
    if (props.boxer.bio) {
      sections.push({
        label: 'About',
        to: '#about',
      })
    }

    // Fight History
    sections.push({
      label: 'Fights',
      to: '#fight-history',
    })

    return sections
  })
</script>

<template>
  <nav class="sticky top-16 z-40 bg-default border-b border-default">
    <UContainer class="py-3">
      <div class="flex items-center gap-1.5 overflow-x-auto">
        <template v-for="item in items">
          <UButton
            :to="item.to"
            :label="item.label"
            :exact-hash="true"
            size="md"
            variant="link"
            color="neutral"
          />
        </template>
      </div>
    </UContainer>
  </nav>
</template>
