export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: ['@nuxt/ui', '@nuxt/fonts', '@nuxt/image', '@nuxt/eslint'],

  // Configure @nuxt/eslint to work with antfu config
  eslint: {
    config: {
      standalone: false, // Generate only Nuxt-specific rules
    },
  },

  css: [
    '~/assets/css/main.css',
  ],

  // Font configuration using @nuxt/fonts
  fonts: {
    families: [
      // Inter font family for body text (matching original)
      {
        name: 'Inter',
        provider: 'fontsource',
        weights: [400, 500, 600, 700],
      },
      // Geist Mono for code/logo (matching original)
      {
        name: 'Geist Mono',
        provider: 'fontsource',
        weights: [400, 500],
      },
    ],
  },

  // Color mode configuration (handled by @nuxtjs/color-mode auto-installed with Nuxt UI)
  colorMode: {
    preference: 'system',
    fallback: 'light',
    hid: 'nuxt-color-mode-script',
    globalName: '__NUXT_COLOR_MODE__',
    componentName: 'ColorScheme',
    classPrefix: '',
    classSuffix: '',
    storageKey: 'flux.appearance', // Match original localStorage key
  },

  app: {
    head: {
      title: 'SERP DIR',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1' },
        {
          name: 'description',
          content: 'SERP - Search Engine Results Portal. Find MCP servers to give AI agents superpowers.',
        },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },

})
