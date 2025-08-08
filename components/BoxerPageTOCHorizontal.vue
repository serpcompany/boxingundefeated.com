<script setup lang="ts">
import type { Boxer } from '~/types'

interface Props {
  boxer: Boxer
}

const props = defineProps<Props>()

// Build navigation items based on available content
const navigationItems = computed(() => {
  const items = []
  
  // Professional Record
  items.push({
    label: 'Record',
    to: '#professional-record'
  })
  
  
  // Fighter Information
  items.push({
    label: 'Stats',
    to: '#fighter-information'
  })
  
  // Biography (if available)
  if (props.boxer.bio || props.boxer.bio) {
    items.push({
      label: 'About',
      to: '#about'
    })
  }
  
  // Fight History
  items.push({
    label: 'Fights',
    to: '#fight-history'
  })
  
  return items
})

// Update active section when dropdown changes
function handleDropdownChange(sectionId: string) {
  activeSection.value = sectionId
}

// Track active section
const activeSection = ref('')

// Show scroll indicators on mobile
const canScrollLeft = ref(false)
const canScrollRight = ref(false)
const scrollContainer = ref<HTMLElement>()

function checkScroll() {
  if (!scrollContainer.value) return
  
  const { scrollLeft, scrollWidth, clientWidth } = scrollContainer.value
  canScrollLeft.value = scrollLeft > 0
  canScrollRight.value = scrollLeft < scrollWidth - clientWidth - 10
}

// Use ResizeObserver instead of window resize event
const resizeObserver = ref<ResizeObserver>()

onMounted(() => {
  // Check scroll on resize using ResizeObserver
  if (scrollContainer.value) {
    checkScroll()
    if (import.meta.client) {
      resizeObserver.value = new ResizeObserver(() => {
        checkScroll()
      })
      resizeObserver.value.observe(scrollContainer.value)
    }
  }
  
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          activeSection.value = `#${entry.target.id}`
        }
      })
    },
    {
      rootMargin: '-20% 0px -70% 0px'
    }
  )
  
  // Observe all sections
  navigationItems.value.forEach(item => {
    const element = document.querySelector(item.to)
    if (element) {
      observer.observe(element)
    }
  })
  
  onUnmounted(() => {
    observer.disconnect()
    if (import.meta.client && resizeObserver.value) {
      resizeObserver.value.disconnect()
    }
  })
})
</script>

<template>
  <nav class="sticky top-16 z-40 bg-white border-b border-zinc-200">
    <!-- Mobile Dropdown -->
    <div class="sm:hidden">
      <div class="px-4 py-3">
        <USelectMenu
          v-model="activeSection"
          :options="navigationItems"
          option-attribute="label"
          value-attribute="to"
          @change="handleDropdownChange"
          class="w-full"
        >
          <template #label>
            <span class="text-sm font-medium">
              {{ navigationItems.find(item => item.to === activeSection)?.label || 'Jump to section' }}
            </span>
          </template>
        </USelectMenu>
      </div>
    </div>
    
    <!-- Desktop Horizontal Nav -->
    <div class="hidden sm:block max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center gap-1 overflow-x-auto scrollbar-hide py-3">
        <ULink
          v-for="item in navigationItems"
          :key="item.to"
          :to="item.to"
          :class="[
            'px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-all relative',
            activeSection === item.to
              ? 'text-zinc-900'
              : 'text-zinc-500 hover:text-zinc-700'
          ]"
        >
          {{ item.label }}
          <!-- Active indicator -->
          <span 
            v-if="activeSection === item.to"
            class="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 transition-all"
          />
        </ULink>
      </div>
    </div>
  </nav>
</template>

<style scoped>
/* Hide scrollbar but keep functionality */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>