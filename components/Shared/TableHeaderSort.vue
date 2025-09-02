<script setup lang="ts">
  interface SharedTableHeaderSortProps {
    label: string
    column: {
      id: string
      toggleSorting: (desc?: boolean) => void
      getIsSorted: () => 'asc' | 'desc' | false
    }
  }

  const props = defineProps<SharedTableHeaderSortProps>()

  const icon = computed(() => {
    const isSorted = props.column.getIsSorted()

    if (isSorted) {
      return isSorted === 'asc'
        ? 'i-lucide-arrow-up-narrow-wide'
        : 'i-lucide-arrow-down-wide-narrow'
    }
    return 'i-lucide-arrow-up-down'
  })
</script>

<template>
  <UButton
    color="neutral"
    variant="ghost"
    class="-mx-2.5 cursor-pointer font-semibold text-highlighted"
    :icon="icon"
    :label="label"
    @click="() => column.toggleSorting(column.getIsSorted() === 'asc')"
  />
</template>
