<script setup lang="ts">
  const { site } = useAppConfig()

  const skip = ref(0)

  const { data, pending } = await useFetch(
    () => `/api/boxers?skip=${skip.value}&limit=10`,
  )

  useSeoMeta({
    title: site.tagline,
    description: site.description,
    ogTitle: site.tagline,
    ogDescription: site.description,
    ogImage: `${site.url}/og-image-home.jpg`,
    ogUrl: site.url,
    ogType: 'website',
    twitterCard: 'summary_large_image',
    twitterTitle: site.tagline,
    twitterDescription: site.description,
    twitterImage: `${site.url}/og-image-home.jpg`,
  })
</script>

<template>
  <div>
    <UPageHero
      title="Boxing Undefeated"
      description="Your comprehensive guide to the sweet science. Explore fighter profiles, weight divisions, and boxing history."
      class="bg-black"
      :ui="{
        title: 'text-white dark:text-highlighted',
        description: 'max-w-3xl mx-auto text-dimmed dark:text-muted',
      }"
      :links="[
        {
          label: 'Fighters',
          to: '/boxers',
          size: 'lg',
          color: 'neutral',
          variant: 'solid',
        },
        {
          label: 'Weight Divisions',
          to: '/divisions',
          size: 'lg',
          color: 'neutral',
          variant: 'outline',
        },
      ]"
    />

    <UPageSection
      v-if="data"
      title="All Fighters"
      description="Browse our complete database of professional boxers"
    >
      <BoxersTable
        v-model:skip="skip"
        :data="data.boxers"
        :loading="pending"
        :total="data.pagination.total"
        :show-division="true"
      />
    </UPageSection>
  </div>
</template>
