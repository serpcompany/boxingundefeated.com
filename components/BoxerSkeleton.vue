<script setup lang="ts">
// Skeleton loader for boxer detail page
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Breadcrumbs skeleton -->
    <div class="bg-white border-b border-gray-100">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <USkeleton class="h-5 w-48" />
      </div>
    </div>
    
    <!-- Hero skeleton -->
    <div class="bg-zinc-50 py-12">
      <div class="max-w-6xl mx-auto px-6 lg:px-8">
        <div class="flex flex-col md:flex-row gap-8">
          <!-- Image skeleton -->
          <USkeleton class="w-32 h-32 md:w-48 md:h-48 rounded-lg" />
          
          <!-- Content skeleton -->
          <div class="flex-1 space-y-4">
            <USkeleton class="h-8 w-64" />
            <USkeleton class="h-6 w-48" />
            <div class="flex gap-2">
              <USkeleton class="h-8 w-20" />
              <USkeleton class="h-8 w-32" />
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- TOC skeleton -->
    <div class="sticky top-0 z-10 bg-white border-b border-zinc-200">
      <div class="max-w-6xl mx-auto px-6 lg:px-8">
        <div class="flex gap-4 py-4">
          <USkeleton class="h-10 w-24" />
          <USkeleton class="h-10 w-24" />
          <USkeleton class="h-10 w-24" />
          <USkeleton class="h-10 w-24" />
        </div>
      </div>
    </div>
    
    <!-- Content skeleton -->
    <div class="max-w-6xl mx-auto px-6 lg:px-8 py-8 sm:py-12">
      <div class="space-y-8">
        <!-- Stats grid skeleton -->
        <div class="space-y-4">
          <USkeleton class="h-6 w-48" />
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <USkeleton class="h-24" />
            <USkeleton class="h-24" />
            <USkeleton class="h-24" />
            <USkeleton class="h-24" />
          </div>
        </div>
        
        <!-- Info card skeleton -->
        <USkeleton class="h-64" />
        
        <!-- More in division skeleton -->
        <USkeleton class="h-32" />
        
        <!-- Biography skeleton -->
        <div class="space-y-4">
          <USkeleton class="h-6 w-32" />
          <USkeleton class="h-4 w-full" />
          <USkeleton class="h-4 w-full" />
          <USkeleton class="h-4 w-3/4" />
        </div>
        
        <!-- Fight history skeleton -->
        <div class="space-y-4">
          <USkeleton class="h-6 w-40" />
          <USkeleton class="h-96" />
        </div>
      </div>
    </div>
  </div>
</template>