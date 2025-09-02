<script setup lang="ts">
  import { SharedTableHeaderSort, UBadge, ULink } from '#components'
  import type { TableColumn } from '@nuxt/ui'
  import { format } from 'date-fns'

  type bt = {
    boxerId: '765995'
    boxrecId: '3311903'
    boutDate: 'May 25'
    opponentName: 'Rolando Romero'
    opponentWeight: null
    opponentRecord: null
    eventName: 'Times Square, New York'
    refereeName: null
    judge1Name: null
    judge1Score: null
    judge2Name: null
    judge2Score: null
    judge3Name: null
    judge3Score: null
    numRoundsScheduled: null
    result: 'loss'
    resultMethod: null
    resultRound: null
    eventPageLink: null
    boutPageLink: 'https://boxrec.com/en/event/916526/3311903'
    scorecardsPageLink: null
    titleFight: false
  }

  interface BoxersSingleHistoryProps {
    data: bt[]
  }

  const props = defineProps<BoxersSingleHistoryProps>()

  const columns: TableColumn<bt>[] = [
    {
      header: '#',
      cell: ({ row }) => `#${props.data.length - row.index}`,
    },
    {
      accessorKey: 'boutDate',
      sortingFn: (a, b) => {
        const dateA = parseFightDate(a.original.boutDate)
        const dateB = parseFightDate(b.original.boutDate)

        return dateA.valueOf() - dateB.valueOf()
      },
      header: ({ column }) => {
        return h(SharedTableHeaderSort, {
          label: 'Date',
          column,
        })
      },
      cell: ({ row }) => {
        return format(parseFightDate(row.original.boutDate), 'MMM yyyy')
      },
    },
    {
      accessorKey: 'opponentName',
      header: ({ column }) => {
        return h(SharedTableHeaderSort, {
          label: 'Opponent',
          column,
        })
      },
      cell: ({ row }) => {
        return h(
          ULink,
          {
            to: formatBoxerLink(row.original.opponentName),
            class: 'font-medium',
          },
          () => row.original.opponentName,
        )
      },
    },
    {
      header: 'Result',
      cell: ({ row }) => {
        const color =
          {
            win: 'success' as const,
            loss: 'error' as const,
          }[row.original.result] ?? 'neutral'

        const label =
          {
            win: 'Win',
            loss: 'Loss',
            draw: 'Draw',
          }[row.original.result] ?? 'NC'

        return h(UBadge, {
          variant: 'subtle',
          label,
          color,
        })
      },
    },
    {
      accessorKey: 'eventName',
      header: ({ column }) => {
        return h(SharedTableHeaderSort, {
          label: 'Venue',
          column,
        })
      },
      cell: ({ row }) => {
        return row.original.eventName
      },
    },
  ]
</script>

<template>
  <BoxersSingleSection id="fighter-history" title="Fights & Results">
    <UCard
      :ui="{ body: 'p-0 sm:p-0', root: 'ring-accented' }"
      variant="outline"
    >
      <UTable :data="data" :columns="columns" />
    </UCard>
  </BoxersSingleSection>
</template>
