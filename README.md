# README

Repurpose this theme to accomodate 'boxing' instead of 'mcp servers' so we can relaunch the boxingundefeated.com website.

## Pages Needed:

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

We will start with the entities: 

- `boxer`
- `division`
- `bout`


Get the fields we need from the boxingundefeated.com site, or we can just start simple


*** I put some downloaded html pages from boxrec.com in reference/boxrec.com/

We should just model off them

## Data shape

Here is some old schema weve used before for ideas:

```


| TABLE_NAME                       | COLUMN_NAME                                 | COLUMN_TYPE     |
| -------------------------------- | ------------------------------------------- | --------------- |
| boxing_boxers                    | id                                          | int unsigned    |
| boxing_boxers                    | created_at                                  | timestamp       |
| boxing_boxers                    | boxer_name                                  | varchar(255)    |
| boxing_boxers                    | boxer_name_sanitized                        | varchar(255)    |
| boxing_boxers                    | boxer_nicknames                             | json            |
| boxing_boxers                    | boxer_birthdate                             | date            |
| boxing_boxers                    | boxer_deathdate                             | date            |
| boxing_boxers                    | boxer_nationality                           | json            |
| boxing_boxers                    | boxer_stance                                | varchar(255)    |
| boxing_boxers                    | boxer_num_wins                              | int             |
| boxing_boxers                    | boxer_num_losses                            | int             |
| boxing_boxers                    | boxer_draws                                 | int             |
| boxing_boxers                    | boxer_ko                                    | int             |
| boxing_boxers                    | boxer_no_contest                            | int             |
| boxing_boxers                    | boxer_image_url                             | varchar(1000)   |
| boxing_boxers                    | boxer_bio                                   | mediumtext      |
| boxing_boxers                    | boxer_people_table_fk                       | bigint unsigned |
| boxing_boxers                    | boxer_weight_class                          | json            |
| boxing_boxers                    | cloudflare_boxer_image_url                  | varchar(1000)   |
| boxing_boxers                    | boxer_slug                                  | varchar(255)    |
| boxing_boxers                    | boxer_description                           | mediumtext      |
| boxing_boxers                    | boxer_article                               | mediumtext      |
| boxing_boxers                    | boxer_title_wins                            | int             |
| boxing_boxers                    | boxer_title_defenses                        | int             |
| boxing_boxers                    | boxer_title_kos                             | int             |
| boxing_boxers                    | boxer_losses_ko                             | int             |
| boxing_boxers                    | boxer_birthplace                            | varchar(255)    |
| boxing_boxers                    | boxer_debut                                 | date            |
| boxing_boxers                    | boxer_ape_index                             | varchar(255)    |
| boxing_boxers                    | division                                    | varchar(255)    |
| boxing_boxers                    | rating                                      | int             |
| boxing_boxers                    | birth_name                                  | varchar(255)    |
| boxing_boxers                    | sex                                         | varchar(255)    |
| boxing_boxers                    | alias                                       | varchar(255)    |
| boxing_boxers                    | age                                         | int             |
| boxing_boxers                    | residence                                   | varchar(255)    |
| boxing_boxers                    | manager_agent                               | varchar(255)    |
| boxing_boxers                    | promoter                                    | varchar(255)    |
| boxing_boxers                    | status                                      | varchar(255)    |
| boxing_boxers                    | profile_picture_url                         | varchar(1000)   |
| boxing_boxers                    | height_imperial                             | varchar(32)     |
| boxing_boxers                    | height_metric                               | varchar(32)     |
| boxing_boxers                    | weight_imperial                             | varchar(32)     |
| boxing_boxers                    | weight_metric                               | varchar(32)     |
| boxing_boxers                    | bouts                                       | int             |
| boxing_boxers                    | rounds                                      | int             |
| boxing_boxers                    | career                                      | varchar(32)     |
| boxing_boxers                    | debut                                       | varchar(32)     |
| boxing_boxers                    | reach_imperial                              | varchar(32)     |
| boxing_boxers                    | reach_metric                                | varchar(32)     |
| boxing_boxers                    | ko_percent                                  | varchar(32)     |
| boxing_boxers                    | boxrec_url                                  | varchar(255)    |
| boxing_boxers                    | martialbot_boxer_name                       | varchar(255)    |
| boxing_boxers                    | martialbot_total_fights                     | int             |
| boxing_boxers                    | martialbot_wins                             | int             |
| boxing_boxers                    | martialbot_losses                           | int             |
| boxing_boxers                    | martialbot_draws                            | int             |
| boxing_boxers                    | martialbot_no_contests                      | int             |
| boxing_boxers                    | martialbot_ko_wins                          | int             |
| boxing_boxers                    | martialbot_total_title_wins                 | int             |
| boxing_boxers                    | martialbot_title_defenses                   | int             |
| boxing_boxers                    | martialbot_title_fight_ko_wins              | int             |
| boxing_boxers                    | martialbot_losses_via_ko                    | int             |
| boxing_boxers                    | martialbot_boxer_nationality                | varchar(255)    |
| boxing_boxers                    | martialbot_boxer_birthplace                 | varchar(255)    |
| boxing_boxers                    | martialbot_boxer_nickname                   | varchar(255)    |
| boxing_boxers                    | martialbot_boxer_date_of_birth              | varchar(255)    |
| boxing_boxers                    | martialbot_boxer_debut                      | varchar(255)    |
| boxing_boxers                    | martialbot_boxer_height                     | varchar(20)     |
| boxing_boxers                    | martialbot_boxer_weight                     | varchar(20)     |
| boxing_boxers                    | martialbot_boxer_reach                      | varchar(20)     |
| boxing_boxers                    | martialbot_boxer_ape_index                  | varchar(20)     |
| boxing_boxers                    | martialbot_boxer_stance                     | varchar(50)     |
| boxing_boxers                    | boxer_professional_career_wikipedia_content | mediumtext      |
| boxing_boxers                    | boxer_amateur_career_wikipedia_content      | mediumtext      |
| boxing_boxers                    | boxer_personal_life_wikipedia_content       | mediumtext      |
| boxing_boxers                    | boxer_wikidata_url                          | varchar(255)    |
| boxing_boxers                    | boxer_wikidata_QID                          | varchar(255)    |
| boxing_boxers                    | boxer_wikipedia_url                         | varchar(255)    |
| boxing_boxers                    | boxer_boxrec_id                             | int             |
| boxing_boxers                    | boxer_boxrec_url                            | varchar(255)    |
| boxing_boxers                    | martialbot_url                              | varchar(255)    |
| boxing_boxers                    | martialbot_career_summary                   | mediumtext      |
| boxing_boxers                    | martialbot_career_highlights                | mediumtext      |
| boxing_boxers                    | boxrec_image_url                            | varchar(255)    |
| boxing_boxers                    | faq                                         | json            |
| boxing_boxers                    | division_fk                                 | int unsigned    |
| boxing_boxers                    | martialbot_excerpt                          | varchar(255)    |
| boxing_boxers                    | martialbot_bio                              | mediumtext      |
| boxing_boxers                    | martialbot_title_fights                     | int             |
| boxing_boxers                    | martialbot_boxer_instagram                  | varchar(255)    |
| boxing_boxers                    | martialbot_boxer_twitter                    | varchar(255)    |
| boxing_boxers                    | martialbot_birthdate                        | date            |
| boxing_boxers                    | martialbot_age                              | int             |
| boxing_boxers                    | martialbot_debut                            | date            |
| boxing_boxers                    | ghost_html                                  | mediumtext      |
| boxing_boxers                    | google_search_chatgpt_boxer_image_url       | varchar(1000)   |
| boxing_boxers                    | va_sourced_boxer_image_url                  | varchar(1000)   |
| boxing_boxers_titles_map         | boxer_id                                    | int unsigned    |
| boxing_boxers_titles_map         | title_id                                    | int unsigned    |
| boxing_boxers_weight_class_map   | boxer_id                                    | int unsigned    |
| boxing_boxers_weight_class_map   | weight_class_id                             | int unsigned    |
| boxing_calendar                  | id                                          | int unsigned    |
| boxing_calendar                  | date                                        | date            |
| boxing_calendar                  | content                                     | text            |
| boxing_calendar_boxers_map       | calendar_id                                 | int unsigned    |
| boxing_calendar_boxers_map       | boxer_id                                    | int unsigned    |
| boxing_fights                    | id                                          | int unsigned    |
| boxing_fights                    | created_at                                  | timestamp       |
| boxing_fights                    | fight_name                                  | varchar(255)    |
| boxing_fights                    | fight_nickname                              | varchar(255)    |
| boxing_fights                    | boxer_a_side_id_fk                          | int unsigned    |
| boxing_fights                    | boxer_b_side_id_fk                          | int unsigned    |
| boxing_fights                    | venue                                       | varchar(255)    |
| boxing_fights                    | rounds                                      | varchar(10)     |
| boxing_fights                    | time                                        | varchar(20)     |
| boxing_fights                    | notes                                       | varchar(512)    |
| boxing_fights                    | date                                        | varchar(255)    |
| boxing_fights                    | type                                        | varchar(10)     |
| boxing_fights                    | result                                      | varchar(55)     |
| boxing_fights                    | slug                                        | varchar(255)    |
| boxing_fights                    | excerpt                                     | varchar(255)    |
| boxing_fights                    | content                                     | mediumtext      |
| boxing_fights                    | boxrec_id                                   | int             |
| boxing_titles                    | id                                          | int unsigned    |
| boxing_titles                    | title                                       | varchar(255)    |
| boxing_weight_classes            | id                                          | int unsigned    |
| boxing_weight_classes            | created_at                                  | timestamp       |
| boxing_weight_classes            | weight_class                                | varchar(255)    |
| boxing_weight_classes            | weight_class_slug                           | varchar(255)    |
| boxing_weight_classes            | professional                                | tinyint(1)      |
| boxing_weight_classes            | weight_limit_lbs                            | int             |
| boxing_weight_classes            | weight_limit_kg                             | float           |
| boxing_weight_classes            | weight_class_image                          | varchar(255)    |
| projects_modules_boxers_map      | module_id                                   | bigint unsigned |
| projects_modules_boxers_map      | boxer_id                                    | int unsigned    |
| projects_modules_boxers_map      | article                                     | mediumtext      |
| projects_modules_boxers_map      | url_fk                                      | bigint unsigned |


```
## Current website urls:

- https://boxingundefeated.com/sitemap_index.xml.gz/
- https://boxingundefeated.com/sitemap_boxers_1.xml.gz/