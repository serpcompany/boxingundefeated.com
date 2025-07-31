# Data Display Status

This document tracks which data fields from our database schema are currently displayed on the website.

## Boxer Data

### Boxer Detail Page (`/boxers/[slug]`)

| Field | Schema | Displayed | Notes |
|-------|--------|-----------|-------|
| id | ✅ | ❌ | Internal use only |
| name | ✅ | ✅ | Main heading |
| slug | ✅ | ✅ | Used in URL |
| nickname | ✅ | ✅ | Shown after name |
| birthdate | ✅ | ✅ | In personal info sidebar |
| nationality | ✅ | ✅ | In personal info sidebar |
| height | ✅ | ✅ | Physical attributes section |
| reach | ✅ | ✅ | Physical attributes section |
| stance | ✅ | ✅ | Physical attributes section |
| division | ✅ | ✅ | Links to division page |
| wins | ✅ | ✅ | Part of record display |
| losses | ✅ | ✅ | Part of record display |
| draws | ✅ | ✅ | Part of record display |
| knockouts | ✅ | ✅ | Shown separately |
| active | ✅ | ✅ | Active/Retired badge |
| image_url | ✅ | ✅ | Boxer photo |
| bio | ✅ | ✅ | Biography section |
| created_at | ✅ | ❌ | Metadata |
| updated_at | ✅ | ❌ | Metadata |

### Boxer Listing Page (`/boxers`)

| Field | Schema | Displayed | Notes |
|-------|--------|-----------|-------|
| name | ✅ | ✅ | Card title |
| nickname | ✅ | ✅ | Under name |
| image_url | ✅ | ✅ | Card thumbnail |
| active | ✅ | ✅ | Badge |
| division | ✅ | ✅ | Badge |
| wins | ✅ | ✅ | Record format |
| losses | ✅ | ✅ | Record format |
| draws | ✅ | ✅ | Record format |
| knockouts | ✅ | ✅ | KOs stat |
| nationality | ✅ | ✅ | Country field |

## Division Data

### Division Pages (`/divisions/[slug]`)

| Field | Schema | Displayed | Notes |
|-------|--------|-----------|-------|
| id | ✅ | ❌ | Internal use only |
| name | ✅ | ✅ | Page heading |
| slug | ✅ | ✅ | Used in URL |
| weight_limit_lbs | ✅ | ✅ | Weight limit display |
| weight_limit_kg | ✅ | ✅ | Weight limit display |
| order_index | ✅ | ❌ | Used for sorting only |
| created_at | ✅ | ❌ | Metadata |
| updated_at | ✅ | ❌ | Metadata |

## Not Yet Implemented

### Bouts Table
- ❌ No bout/fight pages created yet
- ❌ No fight history shown on boxer pages
- ❌ No upcoming fights section

### Rankings Table
- ❌ No ranking pages created
- ❌ No rankings shown on boxer or division pages
- ❌ No organization-specific rankings (BoxRec, Ring, ESPN)

### Titles Table
- ❌ No championship history pages
- ❌ No title lineage displays
- ❌ No belt/organization tracking
- ❌ Title defenses not tracked

## Data Available but Not Displayed

### From TypeScript Interface (types/Boxing.d.ts)
- birthPlace - Field exists but no data in mock
- titles array - Field exists but empty in mock data
- socialLinks - Field exists but empty in mock data

## Recommendations

1. **Priority 1**: Implement bout history on boxer detail pages
2. **Priority 2**: Add rankings display on division pages
3. **Priority 3**: Create title/championship tracking
4. **Priority 4**: Add fight results and upcoming fights sections
5. **Priority 5**: Populate missing data fields (birthPlace, titles, social links)

## Update History

- 2025-07-27: Initial assessment of data display status