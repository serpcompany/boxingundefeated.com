# Boxing Database Schema

## boxer single page

### 1. Boxer Data

- id (primary key)
- boxrec_id (unique)
- boxrec_url (unique)
- boxrec_wiki_url (unique)
- slug (unique, url-friendly)
- full_name
- birth_name
- nickname
- image_url
- residence
- birth_place
- date_of_birth
- gender
- nationality
- height
- reach
- weight
- stance (orthodox/southpaw/switch)
- bio (text)
- promoter
- trainer
- manager
- gym
- pro_debut_date
- pro_division
- pro_wins
- pro_wins_by_knockout
- pro_losses
- pro_losses_by_knockout
- pro_draws
- pro_status (active, retired)
- pro_total_bouts
- pro_total_rounds
- amateur_debut_date
- amateur_division
- amateur_wins
- amateur_wins_by_knockout
- amateur_losses
- amateur_losses_by_knockout
- amateur_draws
- amateur_status (active, retired)
- amateur_total_bouts
- amateur_total_rounds
- created_at
- updated_at

### 2. Fights table data

**For each fight:**

- bout_date
- opponent_name
- opponent_weight
- opponent_record
- venue_name
- referee_name
- judge_1_name
- judge_1_score
- judge_2_name
- judge_2_score
- judge_3_name
- judge_3_score
- num_rounds_scheduled
- result (win/loss/draw/no-contest)
- result_method (ko/tko/decision/dq/rtd)
- result_round
- event_page_link
- bout_page_link
- scorecards_page_link
- title_fight (boolean)

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