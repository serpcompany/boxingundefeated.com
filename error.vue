<script setup lang="ts">
  import type { NuxtError } from '#app'

  const props = defineProps<{
    error: NuxtError<any>
  }>()

  const redirect = computed<string>(() => props.error.data?.redirect || '/')
</script>

<template>
  <div>
    <NuxtLayout name="default">
      <UError class="-mt-12" :error="error" :redirect="redirect">
        <template #links>
          <UButton
            color="neutral"
            size="lg"
            icon="lucide:arrow-left"
            label="Go back"
            :to="redirect"
          />
        </template>
      </UError>
    </NuxtLayout>
  </div>
</template>
