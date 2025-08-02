export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@nuxt/fonts', '@nuxt/image', '@nuxt/eslint', '@nuxtjs/seo', '@nuxt/scripts', '@nuxthub/core'],
  site: {
    url: 'https://boxingundefeated.com',
  },
   css: [
    '~/assets/css/main.css',
  ],
  compatibilityDate: '2025-08-01',
  eslint: {
    config: {
      standalone: false, // Generate only Nuxt-specific rules
    },
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
  scripts: {
    registry: {
      googleTagManager: {
        id: 'GTM-PP4HWLM',
      },
    },
  },
  hub: {
    database: true, 
    blob: true,     
    kv: true,
    workers: true,     
  },
  // Enable experimental tasks for database seeding and prerender sitemap.xml
  nitro: {
    experimental: {
      tasks: true,
      openAPI: true
    },
    prerender: {
      routes: [],
    },
    preset: 'cloudflare-pages'
  },
  sitemap: {
    defaultSitemapsChunkSize: 25000,
    sitemaps: {
      pages: {
        sources: [
          '/',
          '/about',
          '/boxers',
          '/divisions',
        ],
        defaults: {
          changefreq: 'weekly',
          priority: 0.8,
        },
      },
      boxers: {
        sources: ['/api/sitemap/boxers'], // Dynamic endpoint for all boxer URLs
        chunks: true, // Enable automatic chunking (uses defaultSitemapsChunkSize)
        
      },
      divisions: {
        sources: ['/api/sitemap/divisions'], // Dynamic endpoint for all division URLs
        chunks: true, // Enable automatic chunking (uses defaultSitemapsChunkSize)
      
      },
      legal: {
        sources: [
          '/legal/privacy-policy',
          '/legal/terms-conditions',
          '/legal/dmca',
          '/legal/affiliate-disclosure',
        ],
    
      },
    },
  },
  robots: {
    allow: ['/'],
    disallow: ['/admin'],
    sitemap: 'https://boxingundefeated.com/sitemap_index.xml',
  },

})