<script setup lang="ts">
import type { Division } from '~/types'

interface Props {
  divisions: Division[]
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  compact: false
})

const columns = computed(() => {
  const baseColumns = [
    { key: 'name', label: 'Division' },
    { key: 'weightLimit', label: 'Weight Limit' }
  ]
  
  if (!props.compact) {
    baseColumns.push({ key: 'alternativeNames', label: 'Also Known As' })
  }
  
  return baseColumns
})
</script>

<template>
  <div class="overflow-x-auto">
    <UTable
      :rows="divisions"
      :columns="columns"
      :ui="{
        td: { base: 'whitespace-nowrap' },
        tbody: 'divide-y divide-gray-200',
        tr: { base: 'hover:bg-gray-50 cursor-pointer' }
      }"
      @select="(row: Division) => navigateTo(`/divisions/${row.slug}`)"
    >
      <template #name-data="{ row }">
        <div class="font-medium text-gray-900">
          {{ row.name }}
        </div>
      </template>
      
      <template #weightLimit-data="{ row }">
        <div>
          <template v-if="row.slug === 'heavyweight'">
            <span class="font-medium text-gray-900">No limit</span>
          </template>
          <template v-else>
            <div>
              <div class="font-medium text-gray-900">
                {{ row.weightLimitPounds }} lbs
              </div>
              <div class="text-sm text-gray-500">
                {{ (row.weightLimitPounds * 0.453592).toFixed(1) }} kg
                <span v-if="row.weightLimitStone"> / {{ row.weightLimitStone }}</span>
              </div>
            </div>
          </template>
        </div>
      </template>
      
      <template #alternativeNames-data="{ row }">
        <span v-if="row.alternativeNames && row.alternativeNames.length > 0" class="text-sm text-gray-500">
          {{ row.alternativeNames.join(', ') }}
        </span>
        <span v-else class="text-gray-400">—</span>
      </template>
    </UTable>
  </div>
</template>