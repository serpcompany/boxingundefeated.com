<script setup lang="ts">
interface Props {
  division: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  link?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'sm',
  link: true
})

// Weight class color mapping - gradient from green (light) to red (heavy)
function getDivisionColor(division: string): string {
  // Normalize division name to lowercase with hyphens
  const normalized = division.toLowerCase().replace(/\s+/g, '-')
  
  const colorMap: Record<string, string> = {
    // Heaviest - Red spectrum
    'heavyweight': 'red',
    'cruiserweight': 'red',
    'light-heavyweight': 'orange',
    'super-middleweight': 'orange',
    'middleweight': 'amber',
    'light-middleweight': 'amber',
    'super-welterweight': 'yellow',
    'welterweight': 'yellow',
    // Middle - Yellow/Green spectrum  
    'super-lightweight': 'lime',
    'lightweight': 'lime',
    'super-featherweight': 'green',
    'featherweight': 'green',
    // Lightest - Green spectrum
    'super-bantamweight': 'emerald',
    'bantamweight': 'emerald',
    'super-flyweight': 'green',
    'flyweight': 'green',
    'light-flyweight': 'green',
    'minimumweight': 'green'
  }
  
  return colorMap[normalized] || 'gray'
}

const divisionUrl = computed(() => {
  return `/divisions/${props.division.toLowerCase().replace(/\s+/g, '-')}`
})

const color = computed(() => getDivisionColor(props.division))

// Get border class based on color
const borderClass = computed(() => {
  const borderMap: Record<string, string> = {
    'red': 'border border-red-500',
    'orange': 'border border-orange-500',
    'amber': 'border border-amber-500',
    'yellow': 'border border-yellow-500',
    'lime': 'border border-lime-500',
    'green': 'border border-green-500',
    'emerald': 'border border-emerald-500',
    'gray': 'border border-gray-500'
  }
  return borderMap[color.value] || 'border border-gray-500'
})
</script>

<template>
  <NuxtLink 
    v-if="link"
    :to="divisionUrl"
    class="inline-block"
  >
    <UBadge 
      :color="color"
      variant="soft"
      :size="size"
      :class="[borderClass, 'hover:opacity-80 transition-opacity font-medium']"
    >
      {{ division }}
    </UBadge>
  </NuxtLink>
  
  <UBadge 
    v-else
    :color="color"
    variant="soft"
    :size="size"
    :class="[borderClass, 'font-medium']"
  >
    {{ division }}
  </UBadge>
</template>