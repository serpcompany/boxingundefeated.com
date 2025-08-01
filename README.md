# README


## Sitemap

- /
- /about
- /boxers
- /boxers/[slug].vue
- /divisions
- /divisions/[slug]
- /legal/affiliate-disclosure/
- /legal/privacy-policy/
- /legal/terms-conditions/
- /legal/dmca/


## Development Database (NuxtHub D1 Local)

### READ THIS DOCUMENTATION:

- https://developers.cloudflare.com/d1/best-practices/local-development/
- https://developers.cloudflare.com/pages/framework-guides/deploy-a-nuxt-site/
- https://orm.drizzle.team/docs/drizzle-config-file
- https://orm.drizzle.team/docs/connect-overview
- https://hub.nuxt.com/docs/features/database
- https://hub.nuxt.com/docs/recipes/drizzle
- https://hub.nuxt.com/docs/recipes/cloudflare-access

NuxtHub creates and manages its own local D1 database in `.data/hub/d1/`. This is the database your app uses during development.

### Seed DB:

1. seed-divisions: `server/tasks/seed-divisions.ts`