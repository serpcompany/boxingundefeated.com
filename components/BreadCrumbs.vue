<script setup lang="ts">
  import type { BreadcrumbItem } from '#ui/types'

  interface BreadCrumbsProps {
    items: BreadcrumbItem[]
    includeHome?: boolean
  }

  const props = withDefaults(defineProps<BreadCrumbsProps>(), {
    includeHome: true,
  })

  const items = computed<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [...props.items]

    if (props.includeHome && items.length > 0) {
      items.unshift({
        label: 'Home',
        to: '/',
      })
    }

    return items
  })
</script>

<template>
  <UBreadcrumb :items="items">
    <template #separator>
      <span class="mx-2 text-muted">/</span>
    </template>
  </UBreadcrumb>
</template>
