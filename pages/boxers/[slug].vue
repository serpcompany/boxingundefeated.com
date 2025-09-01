<script setup lang="ts">
  const route = useRoute()
  const appConfig = useAppConfig()

  const { data: boxer, pending } = await useFetch(
    () => `/api/boxers/${route.params.slug}`,
  )

  if (!boxer.value) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Boxer Not Found',
      message: `The boxer "${route.params.slug}" could not be found.`,
      data: {
        redirect: '/boxers',
      },
    })
  }

  useSeoMeta({
    title: () => {
      if (!boxer.value) return 'Boxer Profile'

      const nickname = boxer.value.nicknames ? `"${boxer.value.nicknames}"` : ''

      return `${boxer.value.name} ${nickname}`
    },
    description: () => {
      if (!boxer.value) return appConfig.site.description

      return `${boxer.value.name} Bio, Record, Fights, News & More!`
    },
  })

  useSchemaOrg([
    definePerson({
      name: boxer.value?.name,
      alternateName: boxer.value?.nicknames,
      nationality: {
        '@type': 'Country',
        name: boxer.value?.nationality,
      },
      birthDate: boxer.value?.dateOfBirth,
      birthPlace: definePlace({
        name: boxer.value?.birthPlace,
      }),
      gender: boxer.value?.gender === 'M' ? 'Male' : 'Female',
      jobTitle: 'Professional Boxer',
      sport: 'Boxing',
      height: `${boxer.value?.height} cm`,
      description: `${boxer.value?.name} Bio, Record, Fights, News & More!`,
      image: boxer.value?.avatarImage,
      additionalProperty: [
        {
          '@type': 'PropertyValue',
          name: 'Sport',
          value: 'Boxing',
        },
        {
          '@type': 'PropertyValue',
          name: 'Professional Record',
          value: `${boxer.value?.proWins}-${boxer.value?.proLosses}-${boxer.value?.proDraws}`,
        },
        {
          '@type': 'PropertyValue',
          name: 'Weight Division',
          value: boxer.value?.proDivision || 'Professional',
        },
        {
          '@type': 'PropertyValue',
          name: 'Status',
          value: boxer.value?.proStatus === 'active' ? 'Active' : 'Retired',
        },
      ],
    }),
  ])
</script>

<template>
  <div class="relative">
    <BoxerSkeleton v-if="pending" />
    <template v-else-if="boxer">
      <UContainer class="py-3">
        <BreadCrumbs
          :items="[{ label: 'Boxers', to: '/boxers' }, { label: boxer.name }]"
        />
      </UContainer>

      <USeparator />

      <BoxersSingleHero :boxer="boxer" />

      <USeparator />

      <BoxersSingleToc :boxer="boxer" />

      <BoxersSingleRecord :boxer="boxer" />

      <BoxersSingleProfile :boxer="boxer" />

      <BoxersSingleAbout v-if="boxer.bio" :content="boxer.bio" />

      <BoxersSingleHistory :data="boxer.bouts" />
    </template>
  </div>
</template>
