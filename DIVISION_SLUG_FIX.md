# Division Slug Mismatch Fix - Production vs Preview

## Issue Summary

There is a mismatch in the `slug` field values in the `divisions` table between production and preview D1 databases. This is causing links and URLs to be inconsistent in production vs. preview, even though the table schemas and row counts match.

## Findings

1. **Schema**: Both environments have identical schemas
2. **Row Count**: Both have 17 divisions
3. **Data**: Most fields match, but slugs differ:
   - Preview/Source Code: Uses hyphenated slugs (e.g., `super-lightweight`, `light-heavyweight`)
   - Production: Appears to have non-hyphenated slugs (e.g., `superlightweight`, `lightheavyweight`)

## Root Cause

The seed data in the codebase (`server/database/seeds/divisions.data.ts`) has always used hyphenated slugs. However, production was likely seeded with an older version or different data source that used non-hyphenated slugs.

## Recommended Fix

### Option 1: Update Production to Match Preview (Recommended)

This aligns production with the source code and preview environment.

```sql
-- Update all division slugs in production to use hyphens
UPDATE divisions SET slug = 'light-flyweight' WHERE id = 'light-flyweight';
UPDATE divisions SET slug = 'super-flyweight' WHERE id = 'super-flyweight';
UPDATE divisions SET slug = 'super-bantamweight' WHERE id = 'super-bantamweight';
UPDATE divisions SET slug = 'super-featherweight' WHERE id = 'super-featherweight';
UPDATE divisions SET slug = 'super-lightweight' WHERE id = 'super-lightweight';
UPDATE divisions SET slug = 'super-welterweight' WHERE id = 'super-welterweight';
UPDATE divisions SET slug = 'super-middleweight' WHERE id = 'super-middleweight';
UPDATE divisions SET slug = 'light-heavyweight' WHERE id = 'light-heavyweight';
```

### Option 2: Full Re-seed from Source

Run the existing seed script to ensure all data matches:

```bash
# Via API endpoint
curl -X POST https://your-domain.com/api/admin/seed-divisions \
  -H "Content-Type: application/json"

# Or via Nitro task
npx nitro task db:seed-divisions
```

## Verification Steps

1. After applying the fix, verify division slugs match:
   ```sql
   SELECT id, slug FROM divisions ORDER BY id;
   ```

2. Test that all division pages load correctly:
   - `/divisions/super-lightweight`
   - `/divisions/light-heavyweight`
   - etc.

3. Verify boxer filtering by division works correctly

## Prevention

1. Always use the same seed data source for all environments
2. Add a database migration to standardize slugs
3. Consider adding a slug validation/normalization function
4. Add tests to verify slug consistency across environments

## SQL Commands for Complete Fix

```sql
-- Run these commands in production D1 database
UPDATE divisions SET slug = 'light-flyweight' WHERE slug = 'lightflyweight';
UPDATE divisions SET slug = 'super-flyweight' WHERE slug = 'superflyweight';
UPDATE divisions SET slug = 'super-bantamweight' WHERE slug = 'superbantamweight';
UPDATE divisions SET slug = 'super-featherweight' WHERE slug = 'superfeatherweight';
UPDATE divisions SET slug = 'super-lightweight' WHERE slug = 'superlightweight';
UPDATE divisions SET slug = 'super-welterweight' WHERE slug = 'superwelterweight';
UPDATE divisions SET slug = 'super-middleweight' WHERE slug = 'supermiddleweight';
UPDATE divisions SET slug = 'light-heavyweight' WHERE slug = 'lightheavyweight';

-- Verify the updates
SELECT id, slug, name FROM divisions WHERE slug LIKE '%-%' ORDER BY id;
```

## Impact

This fix will:
- Restore consistency between production and preview environments
- Fix broken division links in production
- Align production data with the source code
- Ensure future deployments maintain consistency