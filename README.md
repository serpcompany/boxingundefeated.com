# README

Repurpose this theme to accomodate 'boxing' instead of 'mcp servers' so we can relaunch the boxingundefeated.com website.

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


## Data needed

- [Data fields](https://docs.google.com/spreadsheets/d/1g6x1PUqBg4_f-Ljn1IF9YqeGJ2m-k3ehhfgu_tWE9oo/edit?gid=0#gid=0)

## Database Commands

### Development Database (D1 Local)

```bash
# Apply migrations to create/update database schema
npx wrangler d1 execute boxingundefeated-localdb --local --file=./server/database/migrations/0000_short_killer_shrike.sql

# View database with Drizzle Studio GUI
npm run db:studio

# Query database directly
npx wrangler d1 execute boxingundefeated-localdb --local --command="SELECT * FROM boxers LIMIT 5;"

# Other useful queries
npx wrangler d1 execute boxingundefeated-localdb --local --command="SELECT COUNT(*) FROM boxers;"
npx wrangler d1 execute boxingundefeated-localdb --local --command="SELECT name FROM sqlite_master WHERE type='table';"
npx wrangler d1 execute boxingundefeated-localdb --local --command="PRAGMA table_info(boxers);"
```

### Database Scripts

- `npm run db:generate` - Generate new migrations from schema changes
- `npm run db:migrate` - Run migrations (use wrangler for D1)
- `npm run db:push` - Push schema changes directly (use wrangler for D1)
- `npm run db:studio` - Open Drizzle Studio GUI to browse database