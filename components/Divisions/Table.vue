<script setup lang="ts">
  import type { Division } from '~/server/db/drizzle'
  import type { TableColumn, TableRow } from '#ui/types'
  import { DivisionsTableWeightCell } from '#components'

  interface DivisionsTableProps {
    data: Division[]
    loading?: boolean
    compact?: boolean
  }

  const props = withDefaults(defineProps<DivisionsTableProps>(), {
    compact: false,
  })

  const columns = computed<TableColumn<Division>[]>(() => {
    const cols: TableColumn<Division>[] = [
      { id: 'name', header: 'Division', cell: ({ row }) => row.original.name },
      {
        id: 'weightLimit',
        header: 'Weight Limit',
        cell: ({ row }) => {
          return h(DivisionsTableWeightCell, { division: row.original })
        },
      },
    ]

    if (!props.compact) {
      cols.push({
        id: 'alternativeNames',
        header: 'Also Known As',
        cell: ({ row }) => {
          const alt = row.original.alternativeNames
          let label: string

          if (Array.isArray(alt)) {
            label = alt.length > 0 ? alt.join(', ') : '—'
          } else if (typeof alt === 'string' && alt.trim().length > 0) {
            label = alt
          } else {
            label = '—'
          }

          return h('span', { class: 'text-sm text-muted' }, label)
        },
      })
    }

    return cols
  })

  function onSelect(row: TableRow<Division>) {
    return navigateTo(`/divisions/${row.original.slug}`)
  }
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0', root: 'ring-accented' }" variant="outline">
    <UTable
      :data="data"
      :columns="columns"
      :loading="loading"
      :ui="{
        thead: 'bg-muted',
        td: 'cursor-pointer',
      }"
      @select="onSelect"
    />
  </UCard>
</template>
