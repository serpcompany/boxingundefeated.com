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
    showDivision?: boolean
    showDivisionFilter?: boolean
    loading?: boolean
  }

  const props = withDefaults(defineProps<BoxersTableProps>(), {
    showDivisionFilter: true,
  })

  const boxers = ref<Boxer[]>(props.data || [])
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
            label: row.original.proStatus !== 'inactive' ? 'Active' : 'Retired',
            color:
              row.original.proStatus !== 'inactive' ? 'secondary' : 'neutral',
            variant: 'subtle',
          }),
      },
    )

    return cols
  })

  const table = useTemplateRef('table')
  const skip = defineModel<number>('skip')
  const globalFilter = ref('')

  const statuses = [
    { label: 'All Status', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Retired', value: 'inactive' },
  ]

  const nationalities = computed(() => getBoxersNationalities(props.data))
  const divisions = computed(() => getBoxersDivisions(props.data))

  function onSelect(row: TableRow<Boxer>) {
    return navigateTo({
      name: 'boxers-slug',
      params: {
        slug: row.original.slug,
      },
    })
  }

  watch(
    () => props.data,
    () => {
      boxers.value = [...boxers.value, ...(props.data || [])]
    },
  )

  onMounted(() => {
    if (skip.value === undefined) return
    useInfiniteScroll(
      (table.value as any)?.$el,
      () => {
        if (skip.value === undefined) return
        skip.value += 10
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
        v-if="showDivisionFilter"
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
        :data="boxers"
        :columns="columns"
        :loading="loading"
        :ui="{ thead: 'bg-muted', td: 'cursor-pointer' }"
        class="flex-1 h-full max-h-200"
        @select="onSelect"
      />
    </UCard>
  </div>
</template>
