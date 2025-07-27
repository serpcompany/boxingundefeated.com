<script setup lang="ts">
import type { Boxer } from '~/types/Boxing'
import { mockBoxers, mockDivisions } from '~/data/boxing-data'

async function fetchBoxerData(slug: string): Promise<Boxer> {
  const boxer = mockBoxers.find(b => b.slug === slug)
  
  if (!boxer) {
    throw new Error(`Boxer with slug "${slug}" not found`)
  }
  
  return boxer
}

const route = useRoute()
const slug = route.params.slug as string

const pending = ref(false)
const error = ref(false)
const boxer = ref<Boxer | null>(null)

onMounted(async () => {
  try {
    pending.value = true
    boxer.value = await fetchBoxerData(slug)
  }
  catch (err) {
    error.value = true
    console.error('Failed to fetch boxer data:', err)
  }
  finally {
    pending.value = false
  }
})

if (import.meta.server || import.meta.env.NODE_ENV === 'test') {
  try {
    boxer.value = await fetchBoxerData(slug)
  }
  catch {
    error.value = true
  }
}

const division = computed(() => {
  if (!boxer.value) return null
  return mockDivisions.find(d => d.slug === boxer.value.division)
})

function formatRecord(boxer: Boxer): string {
  return `${boxer.record.wins}-${boxer.record.losses}-${boxer.record.draws}`
}

function calculateKOPercentage(boxer: Boxer): string {
  if (boxer.record.wins === 0) return '0'
  return ((boxer.record.knockouts / boxer.record.wins) * 100).toFixed(1)
}
</script>

<template>
  <!-- Loading State -->
  <div
    v-if="pending"
    class="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center"
  >
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4" />
      <p class="text-zinc-600 dark:text-zinc-400">
        Loading boxer details...
      </p>
    </div>
  </div>

  <!-- Error State -->
  <div
    v-else-if="error"
    class="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center"
  >
    <div class="text-center">
      <h1 class="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
        Boxer Not Found
      </h1>
      <p class="text-zinc-600 dark:text-zinc-400 mb-4">
        The boxer "{{ slug }}" could not be found.
      </p>
      <NuxtLink to="/boxers" class="text-red-600 hover:text-red-700 dark:text-red-400">
        ← Back to Boxers
      </NuxtLink>
    </div>
  </div>

  <!-- Boxer Content -->
  <div v-else-if="boxer" class="boxer-detail-page">
    <!-- Page Header -->
    <div class="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
      <UContainer class="py-8">
        <div class="lg:grid lg:grid-cols-3 lg:gap-8">
          <!-- Main Header Content -->
          <div class="lg:col-span-2">
            <h1 class="text-3xl font-bold text-zinc-900 dark:text-white mb-3">
              {{ boxer.name }}
              <span v-if="boxer.nickname" class="text-xl text-zinc-600 dark:text-zinc-400">
                "{{ boxer.nickname }}"
              </span>
            </h1>
            <p v-if="boxer.bio" class="text-lg text-zinc-600 dark:text-zinc-400 mb-6">
              {{ boxer.bio }}
            </p>

            <!-- Quick Stats -->
            <div class="flex flex-wrap gap-4">
              <UBadge
                v-if="boxer.active"
                color="green"
                variant="subtle"
                size="lg"
              >
                Active Fighter
              </UBadge>
              <UBadge
                v-else
                color="gray"
                variant="subtle"
                size="lg"
              >
                Retired
              </UBadge>
              <div class="text-zinc-600 dark:text-zinc-400">
                <span class="font-semibold">Record:</span> {{ formatRecord(boxer) }}
              </div>
              <div class="text-zinc-600 dark:text-zinc-400">
                <span class="font-semibold">KOs:</span> {{ boxer.record.knockouts }}
              </div>
            </div>
          </div>

          <!-- Sidebar Info -->
          <div class="mt-8 lg:mt-0">
            <div
              v-if="boxer.image"
              class="bg-zinc-50 dark:bg-zinc-800 rounded-lg overflow-hidden
                     border border-zinc-200 dark:border-zinc-700"
            >
              <img
                :src="boxer.image"
                :alt="boxer.name"
                class="w-full h-auto"
              >
            </div>
          </div>
        </div>
      </UContainer>
    </div>

    <!-- Main Content -->
    <UContainer class="py-8">
      <div class="lg:grid lg:grid-cols-3 lg:gap-8">
        <!-- Main Content Column -->
        <div class="lg:col-span-2 space-y-8">
          <!-- Career Stats -->
          <div class="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow-sm">
            <h2 class="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
              Career Statistics
            </h2>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div class="text-center">
                <div class="text-3xl font-bold text-green-600">
                  {{ boxer.record.wins }}
                </div>
                <div class="text-sm text-zinc-600 dark:text-zinc-400">Wins</div>
              </div>
              <div class="text-center">
                <div class="text-3xl font-bold text-red-600">
                  {{ boxer.record.losses }}
                </div>
                <div class="text-sm text-zinc-600 dark:text-zinc-400">Losses</div>
              </div>
              <div class="text-center">
                <div class="text-3xl font-bold text-yellow-600">
                  {{ boxer.record.draws }}
                </div>
                <div class="text-sm text-zinc-600 dark:text-zinc-400">Draws</div>
              </div>
              <div class="text-center">
                <div class="text-3xl font-bold text-blue-600">
                  {{ calculateKOPercentage(boxer) }}%
                </div>
                <div class="text-sm text-zinc-600 dark:text-zinc-400">KO Rate</div>
              </div>
            </div>

            <div class="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
              <div class="text-center">
                <div class="text-4xl font-bold text-zinc-900 dark:text-white">
                  {{ boxer.record.wins + boxer.record.losses + boxer.record.draws }}
                </div>
                <div class="text-sm text-zinc-600 dark:text-zinc-400">Total Fights</div>
              </div>
            </div>
          </div>

          <!-- Physical Attributes -->
          <div class="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow-sm">
            <h2 class="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
              Physical Attributes
            </h2>
            
            <div class="grid grid-cols-2 gap-6">
              <div v-if="boxer.height">
                <h3 class="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Height
                </h3>
                <p class="text-lg text-zinc-900 dark:text-white">
                  {{ boxer.height }}
                </p>
              </div>
              
              <div v-if="boxer.reach">
                <h3 class="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Reach
                </h3>
                <p class="text-lg text-zinc-900 dark:text-white">
                  {{ boxer.reach }}
                </p>
              </div>
              
              <div v-if="boxer.stance">
                <h3 class="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Stance
                </h3>
                <p class="text-lg text-zinc-900 dark:text-white capitalize">
                  {{ boxer.stance }}
                </p>
              </div>
              
              <div v-if="division">
                <h3 class="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Division
                </h3>
                <NuxtLink
                  :to="`/divisions/${boxer.division}`"
                  class="text-lg text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  {{ division.name }}
                </NuxtLink>
              </div>
            </div>
          </div>

          <!-- Championships -->
          <div v-if="boxer.titles && boxer.titles.length > 0" 
               class="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow-sm">
            <h2 class="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
              Championships
            </h2>
            
            <div class="flex flex-wrap gap-3">
              <UBadge
                v-for="title in boxer.titles"
                :key="title"
                color="amber"
                variant="solid"
                size="lg"
              >
                {{ title }}
              </UBadge>
            </div>
          </div>

          <!-- Biography -->
          <div v-if="boxer.bio" class="prose prose-zinc dark:prose-invert max-w-none">
            <h2>Biography</h2>
            <p>{{ boxer.bio }}</p>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="mt-12 lg:mt-0">
          <div class="lg:sticky lg:top-16 space-y-6">
            <!-- Personal Info -->
            <div
              class="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-5
                     border border-zinc-200 dark:border-zinc-700"
            >
              <h3 class="text-lg font-bold text-zinc-900 dark:text-white mb-4">
                Personal Information
              </h3>
              <div class="space-y-3">
                <div v-if="boxer.birthDate">
                  <h4 class="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Date of Birth
                  </h4>
                  <p class="text-base text-zinc-900 dark:text-white">
                    {{ new Date(boxer.birthDate).toLocaleDateString() }}
                  </p>
                </div>
                
                <div v-if="boxer.birthPlace">
                  <h4 class="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Birthplace
                  </h4>
                  <p class="text-base text-zinc-900 dark:text-white">
                    {{ boxer.birthPlace }}
                  </p>
                </div>
                
                <div v-if="boxer.nationality">
                  <h4 class="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Nationality
                  </h4>
                  <p class="text-base text-zinc-900 dark:text-white">
                    {{ boxer.nationality }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Social Links -->
            <div
              v-if="boxer.socialLinks"
              class="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-5
                     border border-zinc-200 dark:border-zinc-700"
            >
              <h3 class="text-lg font-bold text-zinc-900 dark:text-white mb-4">
                Follow {{ boxer.name }}
              </h3>
              <div class="space-y-3">
                <UButton
                  v-if="boxer.socialLinks.twitter"
                  :to="boxer.socialLinks.twitter"
                  external
                  target="_blank"
                  variant="outline"
                  class="w-full justify-center text-sm"
                >
                  <UIcon name="i-heroicons-at-symbol" class="mr-2" />
                  Twitter
                </UButton>
                
                <UButton
                  v-if="boxer.socialLinks.instagram"
                  :to="boxer.socialLinks.instagram"
                  external
                  target="_blank"
                  variant="outline"
                  class="w-full justify-center text-sm"
                >
                  <UIcon name="i-heroicons-camera" class="mr-2" />
                  Instagram
                </UButton>
                
                <UButton
                  v-if="boxer.socialLinks.website"
                  :to="boxer.socialLinks.website"
                  external
                  target="_blank"
                  variant="outline"
                  class="w-full justify-center text-sm"
                >
                  <UIcon name="i-heroicons-globe-alt" class="mr-2" />
                  Official Website
                </UButton>
              </div>
            </div>

            <!-- Related Boxers -->
            <div
              class="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-5
                     border border-zinc-200 dark:border-zinc-700"
            >
              <h3 class="text-lg font-bold text-zinc-900 dark:text-white mb-4">
                More {{ division?.name }} Fighters
              </h3>
              <p class="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                Explore more boxers in the {{ division?.name }} division
              </p>
              <UButton
                :to="`/divisions/${boxer.division}`"
                variant="ghost"
                size="sm"
                class="mt-3 w-full justify-center text-sm"
              >
                Browse {{ division?.name }}
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<style scoped>
.boxer-detail-page {
  @apply min-h-screen bg-zinc-50 dark:bg-zinc-900;
}
</style>