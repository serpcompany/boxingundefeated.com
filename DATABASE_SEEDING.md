# Database Seeding Guide

This guide explains how to seed your boxing database with divisions, boxers, and boxer bouts data across different environments.

## Overview

Your boxing application has three database environments:
- **Local**: SQLite database file for development
- **Remote Preview**: Cloudflare D1 database for preview deployments
- **Remote Production**: Cloudflare D1 database for production

## Prerequisites

- Ensure you have the JSON boxer data in `data/boxrec_json/`
- Make sure your database migrations are up to date
- Have Wrangler CLI configured with your Cloudflare account

## Local Environment

### 1. Seed Local Database

Run the direct seed script that connects to your local SQLite database:

```bash
pnpm db:seed:direct
```

This will:
- ✅ Read JSON files from `data/boxrec_json/`
- ✅ Insert data directly into your local SQLite database
- ✅ Handle divisions, boxers, and boxer bouts

### 2. Verify Local Data

Check your local development server:
```bash
pnpm dev
# Visit http://localhost:3000/divisions and http://localhost:3000/boxers
```

## Remote Preview Environment

### 1. Export from Local Database

First, export your local data to SQL files:

```bash
# Export all tables from local SQLite database
sqlite3 ./.data/hub/d1/miniflare-D1DatabaseObject/7b8799eb95f0bb5448e259812996a461ce40142dacbdea254ea597e307767f45.sqlite ".dump divisions" > divisions-dump.sql
sqlite3 ./.data/hub/d1/miniflare-D1DatabaseObject/7b8799eb95f0bb5448e259812996a461ce40142dacbdea254ea597e307767f45.sqlite ".dump boxers" > boxers-dump.sql
sqlite3 ./.data/hub/d1/miniflare-D1DatabaseObject/7b8799eb95f0bb5448e259812996a461ce40142dacbdea254ea597e307767f45.sqlite ".dump boxerBouts" > boxer-bouts-dump.sql

# Clean the dumps (remove transaction statements that D1 doesn't like)
grep "INSERT INTO" divisions-dump.sql > divisions-clean.sql
grep "INSERT INTO" boxers-dump.sql > boxers-clean.sql
grep "INSERT INTO" boxer-bouts-dump.sql > boxer-bouts-clean.sql
```

### 2. Upload to Remote Preview

```bash
# Upload divisions
npx wrangler d1 execute DB --env preview --file=divisions-clean.sql --remote

# Upload boxers
npx wrangler d1 execute DB --env preview --file=boxers-clean.sql --remote

# Upload boxer bouts
npx wrangler d1 execute DB --env preview --file=boxer-bouts-clean.sql --remote
```

### 3. Verify Preview Data

```bash
# Check data counts
npx wrangler d1 execute DB --env preview --command="SELECT 'divisions' as table_name, COUNT(*) as count FROM divisions UNION SELECT 'boxers', COUNT(*) FROM boxers UNION SELECT 'boxer_bouts', COUNT(*) FROM boxerBouts;" --remote

# Visit your preview URL (e.g., https://ca4ba078.boxingundefeated-com.pages.dev/divisions/)
```

## Remote Production Environment

### 1. Upload to Production Database

Same process as preview, but target the production environment:

```bash
# Upload to production (remove --env preview)
npx wrangler d1 execute DB --file=divisions-clean.sql --remote
npx wrangler d1 execute DB --file=boxers-clean.sql --remote
npx wrangler d1 execute DB --file=boxer-bouts-clean.sql --remote
```

### 2. Verify Production Data

```bash
# Check production data counts
npx wrangler d1 execute DB --command="SELECT 'divisions' as table_name, COUNT(*) as count FROM divisions UNION SELECT 'boxers', COUNT(*) FROM boxers UNION SELECT 'boxer_bouts', COUNT(*) FROM boxerBouts;" --remote
```

## Available Scripts

Your `package.json` includes these seeding scripts:

```json
{
  "db:seed": "tsx ./server/tasks/seed-all.ts",           // ❌ Requires Nuxt runtime
  "db:seed:standalone": "tsx ./server/tasks/standalone-seed.ts", // ❌ Requires hubDatabase()
  "db:seed:direct": "tsx ./server/tasks/direct-seed.ts"           // ✅ Works for local only
}
```

## Quick Reference

| Environment | Command | Notes |
|-------------|---------|-------|
| **Local** | `pnpm db:seed:direct` | Seeds directly to local SQLite |
| **Preview** | Export → Clean → `wrangler d1 execute --env preview --remote` | Multi-step process |
| **Production** | Export → Clean → `wrangler d1 execute --remote` | Multi-step process |

## Expected Data Counts

After successful seeding, you should have:
- **17 divisions** (boxing weight classes)
- **~2,700 boxers** (professional fighters)
- **~84,000 boxer bouts** (fight records)

## Troubleshooting

- **Transaction errors**: Make sure to use the "clean" SQL files without `BEGIN TRANSACTION` statements
- **File not found**: Check that the SQLite database path in the commands matches your actual local database file
- **Empty results**: Ensure migrations have been applied before seeding data
- **Permission errors**: Make sure you're authenticated with Wrangler (`wrangler auth login`)
