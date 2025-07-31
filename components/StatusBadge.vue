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
const variant = computed(() => 'soft') // Always use soft variant to avoid borders
const borderClass = computed(() => props.active ? 'border border-green-500' : 'border border-gray-500')
</script>

<template>
  <UBadge 
    :color="color"
    :variant="variant"
    :size="size"
    :class="borderClass"
  >
    {{ label }}
  </UBadge>
</template>