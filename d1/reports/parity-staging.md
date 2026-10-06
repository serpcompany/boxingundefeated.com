# D1 parity report: staging

- **Result: PASS**
- Target: `boxingundefeated-com-staging` (`--remote --env staging`)
- Source: `from-pipeline/boxers.json`, 108,670,746 bytes, sha256 `b7705c17ec55b112`
- Generated: 2026-10-06T01:49:04.242Z by `pnpm db:parity -- --target staging` (sample seed 9)

## Row counts

| Table | Source | Intentional drops | Expected | D1 | Match |
| --- | --- | --- | --- | --- | --- |
| divisions | 17 | 0 | 17 | 17 | yes |
| boxers | 5,571 | 1 | 5,570 | 5,570 | yes |
| bouts | 109,541 | 0 | 109,541 | 109,541 | yes |

## Intentional removals

| Slug | BoxRec id | Name | Bouts | Reason |
| --- | --- | --- | --- | --- |
| `world` | 808714 | World | 0 | Misparsed pipeline row: name "World", nationality "Usyk", no record and no bouts, and a bio about Chris Staples (BoxRec 808714). Not a boxer profile. |

Each removed slug still has a static page today; once pages read from D1 (#10), its URL needs a 404 or a redirect.

## Slug coverage (`apps/web/public/data/boxers/index.json`)

| Check | Count |
| --- | --- |
| Slugs in index.json | 5,571 |
| Present in D1 | 5,570 |
| Intentionally dropped | 1 |
| Missing from D1 | 0 |
| Dropped but present in D1 | 0 |
| In D1 but not in index.json | 0 |


## Every row, field by field, against the mapped source

115,128 rows and 2,812,862 fields compared: **0 mismatches**.

| Table | Expected content sha256 | D1 content sha256 | Match |
| --- | --- | --- | --- |
| divisions | `c87b5177605ad042` | `c87b5177605ad042` | yes |
| boxers | `9b1ca0396b763cdd` | `9b1ca0396b763cdd` | yes |
| bouts | `39b4e1f131a18dab` | `39b4e1f131a18dab` | yes |

Content checksums cover every column except the database-assigned `boxers.imported_at` and `bouts.id`.

## Seeded sample against `public/data/boxers/<slug>.json`

200 boxers (seed 9) with 3,285 bouts, 85,440 fields compared: **0 mismatches**. Bout opponents are expected from today's `getOpponentSlug`.

<details><summary>Sampled slugs</summary>

jeo-santisima, raul-alvarez, pat-lawlor, roy-anderson, thomas-francis, billy-barnes, tony-montoya, john-doty, danny-green, michael-haynes, johnny-kim, johnny-sinn, vince-gigante, phil-buchanan, jimmy-gibson, alfonso-herrera, john-casey, terry-fox, antonio-mireles, tyler-haines, john-rankin, mario-camarena, john-horn, edwin-rodriguez, carl-king, peter-morris, daniel-richard, scott-sattler, claudio-marrero, brenda-aylin-torres-zamora, anthony-barnes, tommy-egan, gary-newman, johnny-booth, santiago-gutierrez, nikolai-valuev, pablo-flores, ivan-baranchyk, dave-jacobs, roman-fress, bradley-welsh, paul-whatuira, mickey-finn, jordy-weiss, alexis-espino, josh-taylor, william-king, marco-rodriguez, brandon-scott, noe-hernandez, mike-gallo, shota-taguchi, alma-ibarra, anthony-yigit, shinichi-mori, joe-devine, thierry-chiche, charlie-williams, jeanette-zacarias-zapata, tom-parks, dave-warner, jim-maloney, pat-mccormick, azumah-nelson, alvin-davis, chase-demoor, al-lopez, billy-maze, jack-mulcahy, vitor-belfort, andy-vences, demetrius-robinson, tim-curley, neil-sinclair, ted-barrett, terry-christian, young-napoleon, denys-berinchyk, peter-riley, james-j-jeffries, kenneth-walker, adam-henry, randall-cobb, gabriel-maestre, daryl-brown, gamal-yafai, jimmy-maxwell, cameron-cain, noel-rodriguez, julio-alvarez, jack-burnell, matthew-glover, andrew-banks, lee-kirk, javier-solis, olanrewaju-durodola, kamil-szeremeta, bill-walters, jack-mckinney, shawn-robinson, scott-alexander, darren-jackson, anthony-franco, frank-herlihy, gabriel-vega, dave-hilton, leigh-wood, curtis-moore, christopher-nelson, james-tennyson, kyrone-davis, colton-turner, paco-bueno, marcus-williamson, tony-york, tommy-mcguire, eric-donovan, tony-messenger, nick-pappas, joe-guy, mizuki-yoshida, carl-williams, ema-kozin, emanuel-martinez, harvey-logan, sandor-martin, trey-lippe, sam-maxwell, cliff-bell, anthony-lawrence, billy-lees, jamie-marshall, johnny-mcrae, eddie-shaw, davi-vieira, eusebio-pedroza, billy-kearns, bob-walters, benny-thompson, ray-davis, ryan-mcinerney, danny-castillo, billy-weaver, roy-robinson, miguel-cruz, patrick-gallagher, ruben-gonzalez, dillian-whyte, john-hewitt, tony-chapman, adrian-rodriguez, daniel-schmidt, raul-hernandez, nathan-martinez, eduardo-cruz, george-farmer, troy-barnes, andrew-perez, brandon-harris, ivan-christie, jack-nichols, victor-schelstraete, cody-jones, luke-armstrong, brian-rose, connor-marsden, dylan-wilson, mario-martinez, eric-mitchell, jessie-magdaleno, francisco-reyes, paddy-hogan, justis-huni, mary-mcgee, shane-porter, anthony-young, raul-sanchez, guillermo-vargas, anthony-barela, joe-bryan, kid-mohawk, peter-quillin, lucas-martin-matthysse, jorge-fortea, ramon-sosa, william-jarvis, frank-alexander, devonte-williams, panchito-gomez, phool-singh, primo-carnera, anthony-russell, ben-mills, raul-de-anda, jamie-mcbride, frankie-roberts, john-mugabi, anthony-lee, david-allen, mark-priestley

</details>

## Opponent links against today's `getOpponentSlug`

109,541 bouts checked, 11,213 linked to a profile (1 to the boxer themselves, as today): **0 mismatches**.

## State checksum

Every column, including `bouts.id` and `boxers.imported_at`. A second import of the same source must leave it unchanged.

| Table | sha256 |
| --- | --- |
| divisions | `c87b5177605ad0427634a1e42c0f65e9f53bab3c2b4274eb000c38b0ddebfe4a` |
| boxers | `55cd9c077ab33b99cc2b45f569cd2ec4b7fd16a8df465f6130203c670f0711d1` |
| bouts | `a67edffa2f87802500c7d074423c8611dc5c692df079c38ff04d1a47c658b3ff` |

## Normalization applied

- An empty string in a nullable text column is `NULL`.
- `promoters`, `trainers` and `managers` are split on newlines into a JSON `string[]` (`[]` when empty).
- `titleFight` is `0`/`1`; each bout's `ordinal` is its position in the source array; `boxerId` becomes the `boxer_id` foreign key.
- `dateOfBirth`, `nicknames`, bout dates and the pipeline timestamps are copied verbatim, not parsed.
- Dropped fields (always `null`, `''` or misparsed in the source): `boxrecWikiUrl` and the ten `amateur*` fields.

## Source data quirks

| Quirk | Count | Handling |
| --- | --- | --- |
| `bouts.eventName` is `''` | 629 | Stored as `NULL` |
| `proDebutDate` is `''` | 829 | Stored as `NULL` |
| `proDivision` is `''` | 329 | Stored as `NULL` |
| `proStatus` is `''` | 823 | Stored as `NULL` |
| `residence` is `''` | 1 | Stored as `NULL` |
| `dateOfBirth` set (mostly misparsed text) | 83 | Stored as-is |
| Placeholder avatar (`v6-avatar.svg`) | 2,898 | Stored as-is |
| Bout lists cut at exactly 100 | 93 | Stored as-is |
| Boxers without bouts | 12 | No bout rows |
| Bouts listed from both sides | 4,825 | One row per side, linked by `opponent_boxer_id` |
| Name variants claimed by two boxers | 32 | Today's rule: the later boxer in index order wins |
| Bouts linked to the boxer themselves | 1 | Kept, as today |
| Staff values with two names | 3 | Split into a two-name array |
