<script setup lang="ts">
  const route = useRoute()
  const appConfig = useAppConfig()

  const { data, pending } = await useFetch(
    () => `/api/boxers/${route.params.slug}`,
  )

  if (!data.value) {
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
      if (!data.value) return 'Boxer Profile'

      const nickname = data.value.boxer.nicknames
        ? `"${data.value.boxer.nicknames}"`
        : ''

      return `${data.value.boxer.name} ${nickname}`
    },
    description: () => {
      if (!data.value) return appConfig.site.description

      return `${data.value.boxer.name} Bio, Record, Fights, News & More!`
    },
  })

  useSchemaOrg([
    definePerson({
      name: data.value?.boxer.name,
      alternateName: data.value?.boxer.nicknames,
      nationality: {
        '@type': 'Country',
        name: data.value?.boxer.nationality,
      },
      birthDate: data.value?.boxer.dateOfBirth,
      birthPlace: definePlace({
        name: data.value?.boxer.birthPlace,
      }),
      gender: data.value?.boxer.gender === 'M' ? 'Male' : 'Female',
      jobTitle: 'Professional Boxer',
      sport: 'Boxing',
      height: `${data.value?.boxer.height} cm`,
      description: `${data.value?.boxer.name} Bio, Record, Fights, News & More!`,
      image: data.value?.boxer.avatarImage,
      additionalProperty: [
        {
          '@type': 'PropertyValue',
          name: 'Sport',
          value: 'Boxing',
        },
        {
          '@type': 'PropertyValue',
          name: 'Professional Record',
          value: `${data.value?.boxer.proWins}-${data.value?.boxer.proLosses}-${data.value?.boxer.proDraws}`,
        },
        {
          '@type': 'PropertyValue',
          name: 'Weight Division',
          value: data.value?.boxer.proDivision || 'Professional',
        },
        {
          '@type': 'PropertyValue',
          name: 'Status',
          value:
            data.value?.boxer.proStatus === 'active' ? 'Active' : 'Retired',
        },
      ],
    }),
  ])
</script>

<template>
  <div class="relative">
    <BoxerSkeleton v-if="pending" />
    <template v-else-if="data">
      <UContainer class="py-3">
        <BreadCrumbs
          :items="[
            { label: 'Boxers', to: '/boxers' },
            { label: data.boxer.name },
          ]"
        />
      </UContainer>

      <USeparator />

      <BoxersSingleHero :boxer="data.boxer" />

      <USeparator />

      <BoxersSingleToc :boxer="data.boxer" />

      <BoxersSingleRecord :boxer="data.boxer" />

      <BoxersSingleProfile :boxer="data.boxer" />

      <BoxersSingleAbout v-if="data.boxer.bio" :content="data.boxer.bio" />

      <BoxersSingleHistory :data="data.fights as any[]" />
    </template>
  </div>
</template>
