<script setup lang="ts">
interface Props {
  active: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'sm'
})

const label = computed(() => props.active ? 'Active' : 'Retired')
const color = computed(() => props.active ? 'green' : 'gray')
const variant = computed(() => props.active ? 'soft' : 'subtle')
</script>

<template>
  <UBadge 
    :color="color"
    :variant="variant"
    :size="size"
  >
    {{ label }}
  </UBadge>
</template>