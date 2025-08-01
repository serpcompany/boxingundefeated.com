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
          name: 'Professional Boxers',
          description: `Directory of ${boxers.length} professional boxers`,
          numberOfItems: boxers.length,
        },
      }),
    },
  ],
})
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-zinc-900">
    <!-- Breadcrumbs -->
    <div class="bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <BreadCrumbs 
          :items="[
            { label: 'Boxers' }
          ]"
        />
      </div>
    </div>

    <!-- All Boxers Table -->
    <section class="py-16 sm:py-24">
      <div class="max-w-6xl mx-auto px-6 lg:px-8">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-zinc-900 dark:text-white mb-4">
            All Fighters
          </h2>
          <p class="text-lg text-zinc-600 dark:text-zinc-400">
            Browse our complete database of professional boxers
          </p>
        </div>
        
        <BoxersTable :boxers="boxers" />
      </div>
    </section>
  </div>
</template>