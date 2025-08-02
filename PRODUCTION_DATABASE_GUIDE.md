# Production Database Management Guide

## Overview

Nuxt Hub automatically manages database migrations across all environments. This guide explains how to properly handle production data.

## Current Options for Production Data

### 1. SQL Migrations (Recommended for Schema & Initial Data)

Migrations in `/server/database/migrations/*.sql` are automatically applied during deployment.

**Example**: We just created `0004_seed-initial-data.sql` for divisions.

To apply this migration to production:
```bash
# Simply deploy - migrations run automatically!
npx nuxthub deploy --production
```

### 2. Manual SQL Execution via Nuxt Hub Dashboard

1. Go to [Nuxt Hub Dashboard](https://admin.hub.nuxt.com)
2. Select your project
3. Navigate to Database tab
4. Use the SQL console to run queries directly

### 3. Create Admin Interface (Future Enhancement)

Build a protected admin UI that allows data management:
- `/admin/boxers` - Add/edit/delete boxers
- `/admin/divisions` - Manage divisions
- `/admin/import` - Bulk import from CSV/JSON

### 4. API Endpoints with Authentication

Create secure API endpoints for data management:
```typescript
// server/api/admin/boxers.post.ts
export default defineEventHandler(async (event) => {
  // Add authentication check
  const { user } = await requireAuth(event)
  if (!user.isAdmin) throw createError({ statusCode: 403 })
  
  // Handle boxer creation
  const boxer = await readBody(event)
  // ... insert logic
})
```

## Immediate Solution: Deploy Seed Migration

To get divisions into production right now:

```bash
# Commit the new migration
git add server/database/migrations/0004_seed-initial-data.sql
git commit -m "Add seed migration for divisions data"
git push origin 32-xml-sitemaps

# Deploy to production - migration runs automatically
npx nuxthub deploy --production
```

## Future Data Management Strategy

### For Static Data (divisions, weight classes):
- Use SQL migrations (like we just did)
- These rarely change, perfect for migrations

### For Dynamic Data (boxers, bouts):
- **Option A**: Build admin interface
- **Option B**: Create import scripts that read from external sources
- **Option C**: Use Nuxt Hub dashboard for occasional updates

### For Bulk Imports:
```typescript
// server/api/admin/import.post.ts
export default defineEventHandler(async (event) => {
  const { data, type } = await readBody(event)
  
  if (type === 'boxers') {
    // Bulk insert boxers
    await useDrizzle()
      .insert(tables.boxers)
      .values(data)
      .onConflictDoUpdate(...)
  }
})
```

## Best Practices

1. **Use Migrations for Schema**: Always use migrations for database structure
2. **Make Migrations Idempotent**: Use `INSERT OR IGNORE` or `ON CONFLICT` clauses
3. **Test in Preview First**: Deploy to preview before production
4. **Backup Before Major Changes**: Export data via Nuxt Hub dashboard
5. **Version Control Everything**: All migrations should be in git

## Migration Commands Reference

```bash
# Create new migration
npx nuxthub database migrations create <name>

# List migrations status
npx nuxthub database migrations list
npx nuxthub database migrations list --preview
npx nuxthub database migrations list --production

# Mark migrations as applied (if needed)
npx nuxthub database migrations mark-all-applied --production
```

## Current Status

- ✅ Divisions can be seeded via migration `0004_seed-initial-data.sql`
- ⏳ Boxers need bulk import solution
- ⏳ Bouts need bulk import solution

## Next Steps

1. Deploy the seed migration to get divisions in production
2. Create admin interface for boxer management
3. Build import functionality for bulk data
4. Set up regular backups