<script setup lang="ts">
  const { site } = useAppConfig()

  const { data, pending } = await useFetch('/api/boxers')

  const title = 'Professional Boxers'
  const description = computed(
    () =>
      `Browse profiles of ${data.value?.boxers.length} professional boxers from around the world. Filter by weight division and search for your favorite fighters.`,
  )

  useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogImage: `${site.url}/og-image-boxers.jpg`,
    ogUrl: `${site.url}/boxers`,
    ogType: 'website',
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: `${site.url}/og-image-boxers.jpg`,
  })

  // Schema.org structured data for boxers collection page
  useSchemaOrg([
    defineWebSite({
      '@type': 'CollectionPage',
      '@id': `${site.url}/boxers/#webpage`,
      url: `${site.url}/boxers`,
      name: title,
      description,
      isPartOf: {
        '@id': `${site.url}/#website`,
      },
      mainEntity: {
        '@type': 'ItemList',
        name: 'All Boxers',
        description: `Directory of ${data.value?.boxers.length} professional boxers`,
        numberOfItems: data.value?.boxers.length,
      },
    }),
  ])
</script>

<template>
  <div>
    <div class="bg-default border-b border-muted">
      <UContainer class="py-3">
        <BreadCrumbs :items="[{ label: 'Boxers' }]" />
      </UContainer>
    </div>

    <UPageHero
      title="Boxers"
      :description="`Browse profiles of ${data?.boxers.length} professional boxers from around the world.`"
      :ui="{ wrapper: 'text-left' }"
    />

    <UPageSection v-if="data">
      <BoxersTable
        :data="data.boxers"
        :loading="pending"
        :total="data.pagination.total"
        :show-division="true"
      />
    </UPageSection>
  </div>
</template>
