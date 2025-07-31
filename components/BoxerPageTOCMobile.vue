<script setup lang="ts">
import type { Boxer } from '~/types/Boxing'

interface Props {
  boxer: Boxer
}

const props = defineProps<Props>()

// State for menu
const isOpen = ref(false)

// Build navigation items based on available content
const navigationItems = computed(() => {
  const items = []
  
  items.push({
    label: 'Professional Record',
    icon: 'i-heroicons-chart-bar',
    to: '#professional-record',
    click: () => scrollToSection('#professional-record')
  })
  
  if (props.boxer.amateur_total_bouts && props.boxer.amateur_total_bouts > 0) {
    items.push({
      label: 'Amateur Record',
      icon: 'i-heroicons-academic-cap',
      to: '#amateur-record',
      click: () => scrollToSection('#amateur-record')
    })
  }
  
  items.push({
    label: 'Fighter Info',
    icon: 'i-heroicons-user',
    to: '#fighter-information',
    click: () => scrollToSection('#fighter-information')
  })
  
  if (props.boxer.bio || props.boxer.bioSections) {
    items.push({
      label: 'Biography',
      icon: 'i-heroicons-document-text',
      to: '#biography',
      click: () => scrollToSection('#biography')
    })
  }
  
  items.push({
    label: 'Fight History',
    icon: 'i-heroicons-list-bullet',
    to: '#fight-history',
    click: () => scrollToSection('#fight-history')
  })
  
  return items
})

// Smooth scroll to section
function scrollToSection(sectionId: string) {
  isOpen.value = false
  const element = document.querySelector(sectionId)
  if (element) {
    const offset = 80
    const elementPosition = element.getBoundingClientRect().top
    const offsetPosition = elementPosition + window.pageYOffset - offset
    
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    })
  }
}

// Track scroll position
const showFAB = ref(false)

onMounted(() => {
  const handleScroll = () => {
    showFAB.value = window.scrollY > 200
  }
  
  window.addEventListener('scroll', handleScroll)
  
  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
  })
})
</script>

<template>
  <!-- Floating Action Button (Mobile Only) -->
  <div class="sm:hidden">
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div v-if="showFAB" class="fixed bottom-6 right-6 z-50">
        <UDropdown
          v-model:open="isOpen"
          :items="[navigationItems]"
          :popper="{ placement: 'top-end' }"
          class="w-64"
        >
          <UButton
            icon="i-heroicons-bars-3"
            size="xl"
            color="primary"
            variant="solid"
            class="rounded-full shadow-lg"
            :class="{ 'ring-4 ring-primary-400': isOpen }"
          />
        </UDropdown>
      </div>
    </Transition>
  </div>
</template>