<script setup lang="ts">
import type { Division } from '~/types/Boxing'

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
        tbody: 'divide-y divide-gray-200 dark:divide-gray-700',
        tr: { base: 'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer' }
      }"
      @click="(row: Division) => $router.push(`/divisions/${row.slug}`)"
    >
      <template #name-data="{ row }">
        <div class="font-medium text-gray-900 dark:text-white">
          {{ row.name }}
        </div>
      </template>
      
      <template #weightLimit-data="{ row }">
        <div>
          <template v-if="row.slug === 'heavyweight'">
            <span class="font-medium">No limit</span>
          </template>
          <template v-else>
            <WeightDisplay
              :pounds="row.weightLimit.pounds"
              :kilograms="row.weightLimit.kilograms"
              :stone="row.weightLimit.stone"
              format="compact"
            />
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