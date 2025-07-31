export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: ['@nuxt/ui', '@nuxt/fonts', '@nuxt/image', '@nuxt/eslint', '@nuxtjs/seo'],

  // Site configuration for SEO modules
  site: {
    url: 'https://boxingundefeated.com',
  },

  // Sitemap configuration
  sitemap: {
    // Chunk size for automatic sitemap splitting (25,000 URLs max as requested)
    defaultSitemapsChunkSize: 25000,
    
    // Multi-sitemap configuration
    sitemaps: {
      // Core pages sitemap
      pages: {
        urls: ['/', '/about', '/boxers', '/divisions'],
        defaults: {
          changefreq: 'weekly',
          priority: 0.8,
        },
      },
      // Boxers sitemap with sample pages
      boxers: {
        urls: [
          '/boxers/floyd-mayweather-jr',
          '/boxers/manny-pacquiao', 
          '/boxers/canelo-alvarez',
          '/boxers/tyson-fury',
          '/boxers/anthony-joshua',
        ],
        defaults: {
          changefreq: 'monthly',
          priority: 0.7,
        },
      },
      // Divisions sitemap
      divisions: {
        urls: [
          '/divisions/heavyweight',
          '/divisions/cruiserweight',
          '/divisions/light-heavyweight',
          '/divisions/super-middleweight',
          '/divisions/middleweight',
          '/divisions/super-welterweight',
          '/divisions/welterweight',
          '/divisions/super-lightweight',
          '/divisions/lightweight',
        ],
        defaults: {
          changefreq: 'monthly',
          priority: 0.6,
        },
      },
      // Legal pages sitemap
      legal: {
        urls: [
          '/legal/privacy-policy',
          '/legal/terms-conditions', 
          '/legal/dmca',
          '/legal/affiliate-disclosure'
        ],
        defaults: {
          changefreq: 'yearly',
          priority: 0.3,
        },
      },
    },
  },

  // Robots configuration
  robots: {
    allow: ['/'],
    disallow: ['/admin', '/api'],
    sitemap: 'https://boxingundefeated.com/sitemap_index.xml',
  },

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
      title: 'Boxing Undefeated',
      titleTemplate: '%s | Boxing Undefeated',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1' },
        {
          name: 'description',
          content: 'Boxing Undefeated - Your comprehensive guide to professional boxing. Fighter profiles, weight divisions, and the sweet science.',
        },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },

})