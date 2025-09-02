<script setup lang="ts">
  interface FigureImageProps {
    src: string
    alt: string
    caption?: string
    aspect?: 'square' | 'video'
  }

  withDefaults(defineProps<FigureImageProps>(), {
    aspect: 'video',
  })
</script>

<template>
  <figure>
    <NuxtImg
      :src="src"
      :alt="alt"
      :class="[
        aspect === 'square' && 'aspect-square',
        aspect === 'video' && 'aspect-video',
      ]"
      class="w-full rounded-lg bg-muted object-cover"
      format="webp"
    />
    <template v-if="caption || $slots.caption">
      <figcaption
        class="mt-4 flex flex-wrap items-center gap-2 text-sm text-dimmed"
      >
        <UIcon
          name="lucide:info"
          class="size-5 flex-none text-muted"
          aria-hidden="true"
        />
        <template v-if="caption">
          {{ caption }}
        </template>
        <template v-else-if="$slots.caption">
          <slot name="caption" />
        </template>
      </figcaption>
    </template>
  </figure>
</template>
