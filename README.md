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

### Development Database (NuxtHub D1 Local)

NuxtHub creates and manages its own local D1 database in `.data/hub/d1/`. This is the database your app uses during development.

```bash
# View database with Drizzle Studio GUI
npm run db:studio

# Seed database with boxer data
curl http://localhost:3000/api/seed-database

# Clear database (using sqlite3)
sqlite3 ./.data/hub/d1/miniflare-D1DatabaseObject/*.sqlite "DELETE FROM boxerBouts; DELETE FROM boxers;"
```

### Database Scripts

- `npm run db:generate` - Generate new migrations from schema changes
- `npm run db:studio` - Open Drizzle Studio GUI to browse database

### Important Notes

- **Do NOT use `wrangler d1` commands** - NuxtHub manages its own database
- The database is automatically created when you run `npm run dev`
- Migrations are automatically applied by NuxtHub
- Use the `/api/seed-database` endpoint to populate data