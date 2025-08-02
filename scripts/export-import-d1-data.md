# Export/Import D1 Data Between Preview and Production

## Option 1: Direct SQL Export/Import via Cloudflare Dashboard

### Step 1: Export from Preview Database
1. Go to https://dash.cloudflare.com
2. Navigate to Workers & Pages → D1
3. Select `boxingundefeated-com-preview` database
4. Go to Console tab
5. Run these queries to export data:

```sql
-- Export divisions
SELECT * FROM divisions;

-- Export boxers (save results)
SELECT * FROM boxers;

-- Export boxer bouts (save results) 
SELECT * FROM boxerBouts;
```

### Step 2: Import to Production Database
1. Navigate to Workers & Pages → D1
2. Select `boxingundefeated-com` database (NOT preview)
3. Go to Console tab
4. Import the data:

```sql
-- First, import divisions (small dataset, can paste directly)
INSERT INTO divisions (id, slug, name, shortName, weightLimitPounds, weightLimitKilograms, weightLimitStone, alternativeNames) VALUES
('minimumweight', 'minimumweight', 'Minimumweight', 'minimum', 105, 47.627, '7st 7lbs', '["Mini Flyweight"]'),
('light-flyweight', 'light-flyweight', 'Light Flyweight', 'light fly', 108, 48.988, '7st 10lbs', '["Junior Flyweight"]'),
('flyweight', 'flyweight', 'Flyweight', 'fly', 112, 50.802, '8st', NULL),
('super-flyweight', 'super-flyweight', 'Super Flyweight', 'super fly', 115, 52.163, '8st 3lbs', '["Junior Bantamweight"]'),
('bantamweight', 'bantamweight', 'Bantamweight', 'bantam', 118, 53.525, '8st 6lbs', NULL),
('super-bantamweight', 'super-bantamweight', 'Super Bantamweight', 'super bantam', 122, 55.338, '8st 10lbs', '["Junior Featherweight"]'),
('featherweight', 'featherweight', 'Featherweight', 'feather', 126, 57.153, '9st', NULL),
('super-featherweight', 'super-featherweight', 'Super Featherweight', 'super feather', 130, 58.967, '9st 4lbs', '["Junior Lightweight"]'),
('lightweight', 'lightweight', 'Lightweight', 'light', 135, 61.235, '9st 9lbs', NULL),
('super-lightweight', 'super-lightweight', 'Super Lightweight', 'super light', 140, 63.503, '10st', '["Junior Welterweight"]'),
('welterweight', 'welterweight', 'Welterweight', 'welter', 147, 66.678, '10st 7lbs', NULL),
('super-welterweight', 'super-welterweight', 'Super Welterweight', 'super welter', 154, 69.85, '11st', '["Junior Middleweight"]'),
('middleweight', 'middleweight', 'Middleweight', 'middle', 160, 72.574, '11st 6lbs', NULL),
('super-middleweight', 'super-middleweight', 'Super Middleweight', 'super middle', 168, 76.203, '12st', NULL),
('light-heavyweight', 'light-heavyweight', 'Light Heavyweight', 'light heavy', 175, 79.378, '12st 7lbs', NULL),
('cruiserweight', 'cruiserweight', 'Cruiserweight', 'cruiser', 200, 90.718, '14st 4lbs', '["Junior Heavyweight"]'),
('heavyweight', 'heavyweight', 'Heavyweight', 'heavy', 201, 90.719, '14st 5lbs', NULL);
```

## Option 2: Use Wrangler CLI for Export/Import

### Prerequisites
```bash
npm install -g wrangler
wrangler login
```

### Export from Preview
```bash
# Export tables to JSON files
wrangler d1 execute boxingundefeated-com-preview --command "SELECT * FROM divisions" > divisions.json
wrangler d1 execute boxingundefeated-com-preview --command "SELECT * FROM boxers" > boxers.json
wrangler d1 execute boxingundefeated-com-preview --command "SELECT * FROM boxerBouts" > boxerBouts.json
```

### Import to Production
```bash
# Import from JSON files (you'll need to format them as SQL INSERT statements)
wrangler d1 execute boxingundefeated-com --file=divisions.sql
wrangler d1 execute boxingundefeated-com --file=boxers.sql
wrangler d1 execute boxingundefeated-com --file=boxerBouts.sql
```

## Option 3: Use the Migration Files (Recommended)

Since you already have SQL migration files in your project:

1. Go to Cloudflare Dashboard → Workers & Pages → D1
2. Select `boxingundefeated-com` database
3. Execute these files in order via the Console:
   - `0004_seed-initial-data.sql` (divisions)
   - `0005_seed-boxers-part1.sql` through `0015_seed-boxers-part11.sql`

## Verification

After importing, verify the data:

```sql
-- In production D1 console
SELECT COUNT(*) as division_count FROM divisions;
SELECT COUNT(*) as boxer_count FROM boxers;  
SELECT COUNT(*) as bout_count FROM boxerBouts;
```

Then check the website:
- https://boxingundefeated.com/divisions
- https://boxingundefeated.com/boxers
- https://boxingundefeated.com/boxers/muhammad-ali