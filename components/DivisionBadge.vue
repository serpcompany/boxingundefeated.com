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

// Map shortened division names to full names and slugs
const divisionMapping: Record<string, { name: string; slug: string }> = {
  // Short forms from database
  'super feather': { name: 'Super Featherweight', slug: 'super-featherweight' },
  'super light': { name: 'Super Lightweight', slug: 'super-lightweight' },
  'super welter': { name: 'Super Welterweight', slug: 'super-welterweight' },
  'super middle': { name: 'Super Middleweight', slug: 'super-middleweight' },
  'super bantam': { name: 'Super Bantamweight', slug: 'super-bantamweight' },
  'super fly': { name: 'Super Flyweight', slug: 'super-flyweight' },
  'light heavy': { name: 'Light Heavyweight', slug: 'light-heavyweight' },
  'light fly': { name: 'Light Flyweight', slug: 'light-flyweight' },
  'cruiser': { name: 'Cruiserweight', slug: 'cruiserweight' },
  'heavy': { name: 'Heavyweight', slug: 'heavyweight' },
  'middle': { name: 'Middleweight', slug: 'middleweight' },
  'welter': { name: 'Welterweight', slug: 'welterweight' },
  'light': { name: 'Lightweight', slug: 'lightweight' },
  'feather': { name: 'Featherweight', slug: 'featherweight' },
  'bantam': { name: 'Bantamweight', slug: 'bantamweight' },
  'fly': { name: 'Flyweight', slug: 'flyweight' },
  'minimum': { name: 'Minimumweight', slug: 'minimumweight' },
}

const divisionInfo = computed(() => {
  const normalized = props.division.toLowerCase().trim()
  return divisionMapping[normalized] || { 
    name: props.division, 
    slug: props.division.toLowerCase().replace(/\s+/g, '-') 
  }
})

// Weight class color mapping - gradient from green (light) to red (heavy)
function getDivisionColor(slug: string): string {
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
  
  return colorMap[slug] || 'gray'
}

const divisionUrl = computed(() => {
  return `/divisions/${divisionInfo.value.slug}`
})

const color = computed(() => getDivisionColor(divisionInfo.value.slug))

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
      {{ divisionInfo.name }}
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