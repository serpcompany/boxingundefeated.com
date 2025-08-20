<script setup lang="ts">
  import type { FooterColumn } from '#ui-pro/types'

  const columns: FooterColumn[] = [
    {
      label: 'About',
      children: [
        {
          label: 'About',
          to: '/about',
        },
      ],
    },
    {
      label: 'Boxing',
      children: [
        {
          label: 'Boxers',
          to: '/boxers',
        },
        {
          label: 'Divisions',
          to: '/divisions',
        },
      ],
    },
    {
      label: 'Socials',
      children: [
        {
          label: 'Instagram',
          to: 'https://serp.ly/@boxingundefeated/instagram',
        },
        {
          label: 'Youtube',
          to: 'https://serp.ly/@boxingundefeated/youtube',
        },
        {
          label: 'Github',
          to: 'https://serp.ly/@boxingundefeated/github',
        },
      ],
    },
    {
      label: 'Legal',
      children: [
        {
          label: 'Privacy Policy',
          to: '/legal/privacy-policy',
        },
        {
          label: 'Terms & Conditions',
          to: '/legal/terms-conditions',
        },
        {
          label: 'DMCA',
          to: '/legal/dmca',
        },
        {
          label: 'Affiliate Disclosure',
          to: '/legal/affiliate-disclosure',
        },
      ],
    },
  ]
</script>

<template>
  <USeparator class="h-px" />
  <UFooter class="bg-default">
    <template #top>
      <UContainer>
        <UFooterColumns :columns="columns" :ui="{ center: 'xl:col-span-3' }" />
      </UContainer>
    </template>
  </UFooter>
</template>
