<script setup lang="ts">
  import type { BadgeProps } from '#ui/types'

  interface Props {
    active: boolean
    size?: BadgeProps['size']
  }

  const props = withDefaults(defineProps<Props>(), {
    size: 'sm',
  })

  const label = computed(() => (props.active ? 'Active' : 'Retired'))
  const color = computed((): BadgeProps['color'] =>
    props.active ? 'success' : 'neutral',
  )
</script>

<template>
  <UBadge :color="color" :size="size" :label="label" variant="soft" />
</template>
