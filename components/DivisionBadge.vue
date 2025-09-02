<script setup lang="ts">
  import type { BadgeProps } from '#ui/types'
  import { NuxtLink } from '#components'

  interface DivisionBadgeProps {
    division: string
    size?: BadgeProps['size']
    link?: boolean
  }

  const props = withDefaults(defineProps<DivisionBadgeProps>(), {
    size: 'md',
    link: true,
  })

  // Map shortened division names to full names and slugs
  const division = computed(() => {
    // Short forms from database
    const division = {
      'super feather': {
        name: 'Super Featherweight',
        slug: 'super-featherweight',
      },
      'super light': { name: 'Super Lightweight', slug: 'super-lightweight' },
      'super welter': {
        name: 'Super Welterweight',
        slug: 'super-welterweight',
      },
      'super middle': {
        name: 'Super Middleweight',
        slug: 'super-middleweight',
      },
      'super bantam': {
        name: 'Super Bantamweight',
        slug: 'super-bantamweight',
      },
      'super fly': { name: 'Super Flyweight', slug: 'super-flyweight' },
      'light heavy': { name: 'Light Heavyweight', slug: 'light-heavyweight' },
      'light fly': { name: 'Light Flyweight', slug: 'light-flyweight' },
      cruiser: { name: 'Cruiserweight', slug: 'cruiserweight' },
      heavy: { name: 'Heavyweight', slug: 'heavyweight' },
      middle: { name: 'Middleweight', slug: 'middleweight' },
      welter: { name: 'Welterweight', slug: 'welterweight' },
      light: { name: 'Lightweight', slug: 'lightweight' },
      feather: { name: 'Featherweight', slug: 'featherweight' },
      bantam: { name: 'Bantamweight', slug: 'bantamweight' },
      fly: { name: 'Flyweight', slug: 'flyweight' },
      minimum: { name: 'Minimumweight', slug: 'minimumweight' },
    }[props.division]

    return (
      division || {
        name: props.division,
        slug: props.division.toLowerCase().replace(/\s+/g, '-'),
      }
    )
  })

  type DivisionColor =
    | 'red'
    | 'orange'
    | 'amber'
    | 'yellow'
    | 'lime'
    | 'green'
    | 'emerald'
    | 'neutral'

  // Weight class color mapping - gradient from green (light) to red (heavy)
  function getDivisionColor(slug: string): DivisionColor {
    const colorMap: Record<string, DivisionColor> = {
      // Heaviest - Red spectrum
      heavyweight: 'red',
      cruiserweight: 'red',
      'light-heavyweight': 'orange',
      'super-middleweight': 'orange',
      middleweight: 'amber',
      'light-middleweight': 'amber',
      'super-welterweight': 'yellow',
      welterweight: 'yellow',
      // Middle - Yellow/Green spectrum
      'super-lightweight': 'lime',
      lightweight: 'lime',
      'super-featherweight': 'green',
      featherweight: 'green',
      // Lightest - Green spectrum
      'super-bantamweight': 'emerald',
      bantamweight: 'emerald',
      'super-flyweight': 'green',
      flyweight: 'green',
      'light-flyweight': 'green',
      minimumweight: 'green',
    }

    return colorMap[slug] || 'neutral'
  }

  const classes = computed(() => {
    const colors: Record<DivisionColor, string> = {
      red: 'bg-red-500/10 text-red-500 ring-red-500/25',
      orange: 'bg-orange-500/10 text-orange-500 ring-orange-500/25',
      amber: 'bg-amber-500/10 text-amber-500 ring-amber-500/25',
      yellow: 'bg-yellow-500/10 text-yellow-500 ring-yellow-500/25',
      lime: 'bg-lime-500/10 text-lime-500 ring-lime-500/25',
      green: 'bg-green-500/10 text-green-500 ring-green-500/25',
      emerald: 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/25',
      neutral: 'bg-neutral-500/10 text-neutral-500 ring-neutral-500/25',
    }

    return colors[getDivisionColor(division.value.slug)]
  })
</script>

<template>
  <component
    :is="link ? NuxtLink : h('div')"
    v-bind="{ ...(link && { to: `/divisions/${division.slug}` }) }"
    class="flex"
  >
    <UBadge
      variant="subtle"
      color="neutral"
      :class="[classes, link && 'hover:opacity-80 transition-opacity']"
      :size="size"
    >
      {{ division.name }}
    </UBadge>
  </component>
</template>
