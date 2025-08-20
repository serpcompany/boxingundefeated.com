<script setup lang="ts">
  const route = useRoute()
  const slug = route.params.slug as string

  // Fetch division data
  const { data: division } = await useFetch(
    () => `/api/divisions/${route.params.slug}`,
    {
      transform: (input) => input.division,
    },
  )

  if (!division.value) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Division not found',
    })
  }

  // Fetch boxers in this division using the short name
  const { data: boxers } = await useFetch('/api/boxers', {
    query: {
      division: division.value?.shortName || slug,
      limit: 100,
    },
    transform: (input) => input.boxers,
    default: () => [],
  })

  useSeoMeta({
    title: () => `${division.value?.name} Weight Class`,
    description: () =>
      `${division.value?.name} Boxing Division - Champions, Contenders & More!`,
  })
</script>

<template>
  <div>
    <template v-if="division">
      <div class="bg-default border-b border-default">
        <UContainer class="py-3">
          <BreadCrumbs
            :items="[
              { label: 'Divisions', to: '/divisions' },
              { label: division.name },
            ]"
          />
        </UContainer>
      </div>

      <UPageHero :title="division.name" :ui="{ wrapper: 'text-left' }">
        <template #description>
          <div class="space-y-2">
            <p class="">
              Weight Limit:
              {{
                formatWeightLimits(division.slug, division.weightLimitPounds)
              }}
              <span v-if="division.weightLimitStone" class="text-dimmed">
                ({{ division.weightLimitStone }})
              </span>
            </p>
            <template v-if="division.alternativeNames">
              <p class="text-dimmed">
                Also know as: {{ division.alternativeNames.join(', ') }}
              </p>
            </template>
          </div>
        </template>
      </UPageHero>

      <USeparator />

      <UPageSection :title="`Boxers in ${division.name}`">
        <template v-if="boxers.length === 0" class="text-center py-12">
          <UPageCard
            icon="lucide:users"
            variant="naked"
            description="No fighters currently listed in this division."
            :ui="{
              leadingIcon: 'size-12',
              wrapper: 'items-center',
            }"
          />
        </template>
        <template v-else>
          <BoxersTable :data="boxers" :show-division-filter="false" />
        </template>
      </UPageSection>

      <div class="py-16 text-center">
        <UButton
          to="/divisions"
          icon="lucide:arrow-left"
          variant="link"
          color="neutral"
          size="lg"
        >
          Back to all divisions
        </UButton>
      </div>
    </template>
  </div>
</template>
