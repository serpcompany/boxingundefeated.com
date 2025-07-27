# Boxing Database Schema

## Core Tables

### boxers
```sql
- id (primary key)
- name
- slug (unique, url-friendly)
- nickname
- birthdate
- nationality
- height (e.g. "6'2")
- reach (e.g. "72")
- stance (orthodox/southpaw/switch)
- division
- wins
- losses
- draws
- knockouts
- active (boolean)
- image_url
- bio (text)
- created_at
- updated_at
```

### divisions
```sql
- id (primary key)
- name (e.g. "Heavyweight")
- slug (unique, e.g. "heavyweight")
- weight_limit_lbs
- weight_limit_kg
- order_index (1=heaviest)
- created_at
- updated_at
```

### bouts
```sql
- id (primary key)
- boxer1_id (foreign key)
- boxer2_id (foreign key)
- winner_id (foreign key, nullable)
- date
- venue
- city
- country
- division
- result (win/loss/draw/no-contest)
- method (ko/tko/decision/dq/rtd)
- round
- scheduled_rounds
- title_fight (boolean)
- created_at
- updated_at
```

### rankings
```sql
- id (primary key)
- boxer_id (foreign key)
- division
- rank
- organization (boxrec/ring/espn)
- date
- created_at
- updated_at
```

### titles
```sql
- id (primary key)
- boxer_id (foreign key)
- organization (WBA/WBC/IBF/WBO)
- division
- won_date
- lost_date (nullable)
- defenses
- active (boolean)
- created_at
- updated_at
```

## Relationships
- boxers -> many bouts (as boxer1 or boxer2)
- boxers -> many rankings
- boxers -> many titles
- divisions -> many boxers
- divisions -> many bouts