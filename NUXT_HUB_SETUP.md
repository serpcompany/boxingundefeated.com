# Nuxt Hub Database Setup Guide

This project uses **Nuxt Hub** for database management across all environments. We've standardized on Nuxt Hub's approach, which provides:

- **Local Development**: Automatic D1 emulation with local SQLite
- **Preview/Production**: Seamless Cloudflare D1 integration
- **Zero Configuration**: No manual wrangler setup needed

## Environment Setup

### Local Development

```bash
# Install dependencies
pnpm install

# Run migrations (local)
pnpm db:migrate

# Start dev server (database is automatic)
pnpm dev
```

### Database Seeding

We provide two methods for seeding:

#### Method 1: Nuxt Tasks (Recommended)
```bash
# Run all seeders using Nuxt tasks
pnpm db:seed
```

#### Method 2: API Endpoint
```bash
# Start the dev server first
pnpm dev

# In another terminal, call the seed endpoint
pnpm db:seed:api
```

### Deployment

#### Preview Environment
```bash
# Deploy to preview
npx nuxthub deploy --env preview

# Or use GitHub integration for automatic preview deployments
```

#### Production
```bash
# Deploy to production
npx nuxthub deploy
```

## Key Changes from Previous Setup

1. **Removed Wrangler**: No more `wrangler.toml` or manual D1 configuration
2. **Unified Database Access**: All database connections use `hubDatabase()` 
3. **Centralized Seed Data**: Seed data now in `/server/database/seeds/`
4. **Error Handling**: Sitemap endpoints handle database failures gracefully
5. **No Direct SQLite**: Removed `better-sqlite3` and hardcoded paths

## Database Connection

The database is accessed through our unified utility:

```typescript
// server/utils/drizzle.ts
import { drizzle } from 'drizzle-orm/d1'

export function useDrizzle() {
  return drizzle(hubDatabase(), { 
    schema,
    casing: 'camelCase'
  })
}
```

This works automatically in all environments!

## Troubleshooting

### "Missing Cloudflare DB binding" Error
This is normal in local development during startup. The database will be available once Nuxt is fully initialized.

### Sitemap Missing URLs
The sitemap endpoints now handle database errors gracefully. Check the console for specific errors.

### Seeding Failures
Use the API endpoint method which provides detailed error messages:
```bash
curl -X POST http://localhost:3000/api/admin/seed
```

## Migration Commands

```bash
# Generate migrations from schema changes
pnpm db:generate

# Apply migrations locally
pnpm db:migrate

# Open Drizzle Studio (local database viewer)
pnpm db:studio
```

## Environment Variables

The only required environment variable is:
- `NUXT_HUB_PROJECT_KEY`: Automatically set by Nuxt Hub

No need for:
- ❌ `DRIZZLE_DB_URL`
- ❌ `DB_HOST`, `DB_PORT`, etc.
- ❌ Cloudflare account IDs
- ❌ D1 database IDs

## Benefits of This Setup

1. **Consistency**: Same code works everywhere
2. **Simplicity**: No environment-specific configurations
3. **Reliability**: Automatic error handling
4. **Developer Experience**: Fast local development with D1 emulation
5. **Production Ready**: Seamless Cloudflare integration

## Next Steps

1. Run `pnpm install` to update dependencies
2. Test seeding with `pnpm db:seed:api`
3. Deploy to preview: `npx nuxthub deploy --env preview`
4. Check sitemap at `/sitemap_index.xml`