<script setup lang="ts">
  import { useInfiniteScroll } from '@vueuse/core'
  import type { Boxer } from '~/server/db/drizzle'
  import type { TableColumn, TableRow } from '#ui/types'
  import {
    SharedTableHeaderSort,
    DivisionBadge,
    UUser,
    UBadge,
    BoxersTableRecordCell,
  } from '#components'

  interface BoxersTableProps {
    data: Boxer[]
    total: number
    showDivision?: boolean
    loading?: boolean
  }

  const props = defineProps<BoxersTableProps>()

  const columns = computed<TableColumn<Boxer>[]>(() => {
    const cols: TableColumn<Boxer>[] = [
      {
        id: 'fighter',
        accessorKey: 'name',
        header: ({ column }) =>
          h(SharedTableHeaderSort, {
            label: 'Fighter',
            column,
          }),
        cell: ({ row }) =>
          h(UUser, {
            name: row.original.name,
            avatar: {
              src: row.original.avatarImage ?? '',
              alt: row.original.name,
            },
            to: `/boxers/${row.original.slug}`,
            icon: 'hugeicons:boxing-glove-01',
            size: 'lg',
          }),
      },
    ]

    if (props.showDivision) {
      cols.push({
        id: 'weight',
        accessorKey: 'proDivision',
        header: ({ column }) =>
          h(SharedTableHeaderSort, {
            label: 'Weight Class',
            column,
          }),
        cell: ({ row }) =>
          h(DivisionBadge, {
            division: row.original.proDivision ?? '',
          }),
      })
    }

    cols.push(
      {
        id: 'record',
        header: 'Record',
        cell: ({ row }) =>
          h(BoxersTableRecordCell, {
            boxer: row.original,
          }),
      },
      {
        id: 'nationality',
        accessorKey: 'nationality',
        header: ({ column }) =>
          h(SharedTableHeaderSort, {
            label: 'Nationality',
            column,
          }),
        cell: ({ row }) => row.original.nationality,
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'proStatus',
        enableGlobalFilter: false,
        filterFn: 'equalsString',
        cell: ({ row }) =>
          h(UBadge, {
            label: row.original.proStatus === 'active' ? 'Active' : 'Retired',
            color:
              row.original.proStatus === 'active' ? 'secondary' : 'neutral',
            variant: 'subtle',
          }),
      },
    )

    return cols
  })

  function onSelect(row: TableRow<Boxer>) {
    return navigateTo({
      name: 'boxers-slug',
      params: {
        slug: row.original.slug,
      },
    })
  }

  const table = useTemplateRef('table')
  const pageSize = defineModel<number>('pageSize')

  const globalFilter = ref('')

  const statuses = [
    { label: 'All Status', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Retired', value: 'inactive' },
  ]

  const nationalities = computed(() => getBoxersNationalities(props.data))
  const divisions = computed(() => getBoxersDivisions(props.data))

  onMounted(() => {
    if (!pageSize.value) return

    useInfiniteScroll(
      table.value?.tableRef,
      () => {
        if (!pageSize.value) return
        if (props.total < pageSize.value) return
        pageSize.value += 10
      },
      {
        distance: 200,
        canLoadMore: () => {
          return !props.loading
        },
      },
    )
  })
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <div class="flex flex-wrap items-center gap-3">
      <div class="relative flex-1 w-full max-w-md">
        <UInput
          v-model="globalFilter"
          icon="lucide:search"
          class="w-full"
          placeholder="Search..."
          size="lg"
        />
      </div>

      <USelect
        :items="statuses"
        :model-value="
          table?.tableApi.getColumn('status')?.getFilterValue() as string
        "
        @update:model-value="
          table?.tableApi
            .getColumn('status')
            ?.setFilterValue($event !== 'all' ? $event : '')
        "
        placeholder="Status"
        class="w-full max-w-52"
        size="lg"
      />

      <USelect
        :items="nationalities"
        :model-value="
          table?.tableApi.getColumn('nationality')?.getFilterValue() as string
        "
        @update:model-value="
          table?.tableApi
            .getColumn('nationality')
            ?.setFilterValue($event !== 'all' ? $event : '')
        "
        placeholder="Nationality"
        class="w-full max-w-52"
        size="lg"
      />

      <USelect
        :items="divisions"
        :model-value="
          table?.tableApi.getColumn('weight')?.getFilterValue() as string
        "
        @update:model-value="
          table?.tableApi
            .getColumn('weight')
            ?.setFilterValue($event !== 'all' ? $event : '')
        "
        placeholder="Divisions"
        class="w-full max-w-52"
        size="lg"
      />
    </div>

    <UCard
      :ui="{ body: 'p-0 sm:p-0', root: 'ring-accented' }"
      variant="outline"
    >
      <UTable
        ref="table"
        v-model:global-filter="globalFilter"
        :data="data"
        :columns="columns"
        :loading="loading"
        :ui="{ thead: 'bg-muted', td: 'cursor-pointer' }"
        @select="onSelect"
      />
    </UCard>
  </div>
</template>
