<script setup lang="ts">
const { site } = useAppConfig()

useSeoMeta({
  title: 'About',
  description: `Learn about ${site.name}, your comprehensive resource for professional boxing information, fighter profiles, and the sweet science.`,
})
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Breadcrumbs -->
    <div class="bg-white border-b border-gray-100">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <BreadCrumbs 
          :items="[
            { label: 'About' }
          ]"
        />
      </div>
    </div>
    
    <!-- Header -->
    <PageHero 
      title="About Boxing Undefeated"
      subtitle="Your ultimate resource for the sweet science"
    />

    <!-- Main Content -->
    <div class="max-w-6xl mx-auto px-6 lg:px-8 py-12">
      <div class="prose prose-zinc max-w-none">
        <p class="text-lg leading-relaxed">
          Boxing Undefeated is your comprehensive guide to the world of professional boxing. 
          We provide detailed information about fighters, weight divisions, championship titles, 
          and the rich history of the sport.
        </p>

        <h2>Our Mission</h2>
        <p>
          We aim to be the most complete and accessible resource for boxing enthusiasts, 
          from casual fans to dedicated followers of the sport. Our database includes:
        </p>
        <ul>
          <li>Comprehensive fighter profiles with career statistics</li>
          <li>Detailed information about all 17 professional weight divisions</li>
          <li>Historical records and championship lineages</li>
          <li>Fight results and upcoming bout information</li>
        </ul>

        <h2>What We Offer</h2>
        
        <h3>Fighter Profiles</h3>
        <p>
          Each fighter profile includes complete career statistics, physical attributes, 
          championship history, and biographical information. We track wins, losses, draws, 
          and knockout percentages to give you a complete picture of each boxer's career.
        </p>

        <h3>Weight Division Information</h3>
        <p>
          Understand the weight limits and history of each division, from minimumweight 
          to heavyweight. Learn about current champions and notable fighters in each 
          weight class.
        </p>

        <h3>Boxing History</h3>
        <p>
          Explore the rich history of boxing through our extensive database. From the 
          early bare-knuckle era to modern championship boxing, we document the evolution 
          of the sport.
        </p>

        <h2>Stay Connected</h2>
        <p>
          Boxing Undefeated is constantly updated with new fighter information, 
          recent fight results, and the latest developments in professional boxing. 
          Subscribe to our newsletter to stay informed about:
        </p>
        <ul>
          <li>New fighter profiles and updates</li>
          <li>Upcoming championship fights</li>
          <li>Historical boxing features</li>
          <li>Division rankings and changes</li>
        </ul>

        <h2>Contact Us</h2>
        <p>
          Have suggestions for improving Boxing Undefeated? Found an error in our data? 
          We welcome your feedback and contributions to make this the best boxing 
          resource available.
        </p>
      </div>
    </div>
  </div>
</template>