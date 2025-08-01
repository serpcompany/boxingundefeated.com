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

**To run a single seed file individually from the CLI, use:**

```
npx tsx server/tasks/seed-boxers.ts
```

```
npx tsx server/tasks/seed-divisions.ts
```

```
npx tsx server/tasks/seed-boxer-bouts.ts
```


### How to reset and reseed your database in your setup:

**Delete the SQLite file (you already did this):**

```
rm ./.data/hub/d1/miniflare-D1DatabaseObject/7b8799eb95f0bb5448e259812996a461ce40142dacbdea254ea597e307767f45.sqlite
```

**Run Drizzle migrations:**

`npx drizzle-kit migrate`

(Make sure your .env or .env.local has the correct DRIZZLE_DB_URL.)
