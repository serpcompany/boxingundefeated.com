# How to Seed Boxer Bouts Data to Production

## The Issue
- NuxtHub manages its own D1 database instance separate from Wrangler
- The 84,038 boxer bout records are too large for migration files
- The production site at https://boxingundefeated.com shows no fight history

## Solution: Direct Database Upload

### Step 1: Access NuxtHub Admin
1. Go to https://admin.hub.nuxt.com/serp/boxingundefeated-com
2. Click on the "Database" tab
3. You'll see the SQL console

### Step 2: Upload Data in Chunks
Due to size limitations, you'll need to upload the data in chunks:

1. Split the `boxer-bouts-clean.sql` file into smaller chunks (5000 records each)
2. Execute each chunk through the SQL console

Here's a script to split the file:

```bash
# Split into 5000-line chunks
split -l 5000 boxer-bouts-clean.sql boxer-bouts-chunk-

# This creates files like:
# boxer-bouts-chunk-aa
# boxer-bouts-chunk-ab
# etc.
```

### Step 3: Execute Each Chunk
1. Open each chunk file
2. Copy the contents
3. Paste into the NuxtHub SQL console
4. Execute
5. Repeat for all chunks

### Alternative: Use the Seeding API
I've created an API endpoint at `/server/api/admin/seed-boxer-bouts.post.ts`

To use it:
1. Deploy the endpoint first
2. Set an environment variable `SEED_SECRET_KEY` in NuxtHub
3. Call the endpoint:

```bash
curl -X POST https://boxingundefeated.com/api/admin/seed-boxer-bouts \
  -H "Content-Type: application/json" \
  -d '{"secretKey": "your-secret-key"}'
```

Note: You'll need to modify the endpoint to read data from a URL or include it directly since the file won't be available in production.

### Verification
After seeding, verify the data:
1. Visit https://boxingundefeated.com/boxers/muhammad-ali
2. Check if fight history appears
3. Or use the SQL console: `SELECT COUNT(*) FROM boxerBouts;`

## Why This Happened
- Wrangler D1 commands work with Cloudflare D1 databases directly
- NuxtHub abstracts this and creates its own managed D1 instance
- The database we seeded with `wrangler d1 execute` was not the one NuxtHub uses
- Migration files have size limits that prevent large data seeds

## Future Improvements
1. Create a proper admin interface for data management
2. Set up automated imports from external sources
3. Use Cloudflare R2 to store large SQL files for import
4. Build a chunked import system that can handle large datasets