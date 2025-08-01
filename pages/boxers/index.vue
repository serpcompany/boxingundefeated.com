<script setup lang="ts">
const { site } = useAppConfig()

// Fetch boxers data from API using useFetch for proper SSR
const { data: boxersData } = await useFetch('/api/boxers')
const boxers = boxersData.value?.boxers || []

const title = 'Professional Boxers'
const description = `Browse profiles of ${boxers.length} professional boxers from around the world. Filter by weight division and search for your favorite fighters.`

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
useHead({
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
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
          description: `Directory of ${boxers.length} professional boxers`,
          numberOfItems: boxers.length,
        },
      }),
    },
  ],
})
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Breadcrumbs -->
    <div class="bg-white border-b border-gray-100">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <BreadCrumbs 
          :items="[
            { label: 'Boxers' }
          ]"
        />
      </div>
    </div>

    <!-- Hero -->
    <PageHero 
      title="Boxers"
      :description="`Browse profiles of ${boxers.length} professional boxers from around the world.`"
    />

    <!-- All Boxers Table -->
    <section class="py-16 sm:py-24">
      <div class="max-w-6xl mx-auto px-6 lg:px-8">
        
        <BoxersTable :boxers="boxers" :show-division="true" />
      </div>
    </section>
  </div>
</template>