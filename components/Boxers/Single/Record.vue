<script setup lang="ts">
  import type { TabsItem } from '@nuxt/ui'
  import type { Boxer } from '~/server/db/drizzle'

  interface BoxersSingleRecordsProps {
    boxer: Boxer
  }

  const props = defineProps<BoxersSingleRecordsProps>()

  const hasAmateurRecord = computed(
    () => props.boxer.amateurTotalBouts && props.boxer.amateurTotalBouts > 0,
  )

  const tabs = computed((): TabsItem[] => {
    const items: TabsItem[] = [
      {
        label: 'Professional',
        stats: getBoxerStats(props.boxer, 'professional'),
      },
    ]

    if (hasAmateurRecord.value) {
      items.push({
        label: 'Amateur',
        stats: getBoxerStats(props.boxer, 'amateur'),
      })
    }

    return items
  })
</script>

<template>
  <BoxersSingleSection id="professional-record" title="Record">
    <UCard :ui="{ body: 'p-2 sm:p-2' }">
      <UTabs :items="tabs" variant="pill" color="neutral" class="w-full">
        <template #content="{ item }">
          <div class="p-4">
            <dl class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <template v-for="stat in item.stats">
                <div class="text-center space-y-1">
                  <dd
                    class="text-2xl lg:text-3xl font-bold"
                    :class="stat.color"
                  >
                    {{ stat.value }}
                  </dd>
                  <dt class="text-sm text-muted">
                    {{ stat.name }}
                  </dt>
                </div>
              </template>
            </dl>
          </div>
        </template>
      </UTabs>
    </UCard>
  </BoxersSingleSection>
</template>
