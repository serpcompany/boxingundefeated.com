# D1 parity report: staging

- **Result: PASS**
- Target: `boxingundefeated-com-staging` (`--remote --env staging`)
- Source: `from-pipeline/boxers.json`, 108,670,746 bytes, sha256 `b7705c17ec55b112`
- Generated: 2026-10-07T14:34:15.102Z by `pnpm db:parity -- --target staging`
- Method: D1 rows are read back and compared with the JSON by the parity rules (`packages/data-ops/src/parity/rules.ts`), which are written separately from the importer's mapping, so a mapping mistake shows up here.

## Row counts

| Table | Source | Intentional drops | Expected | D1 | Match |
| --- | --- | --- | --- | --- | --- |
| divisions | 17 | 0 | 17 | 17 | yes |
| boxers | 5,571 | 1 | 5,570 | 5,570 | yes |
| bouts | 109,541 | 0 | 109,541 | 109,541 | yes |

Divisions are expected from `REFERENCE_DIVISIONS` (`packages/data-ops/src/parity/reference.ts`).

## Intentional removals

| Slug | BoxRec id | Name | Bouts | Reason |
| --- | --- | --- | --- | --- |
| `world` | 808714 | World | 0 | Misparsed pipeline row: name "World", nationality "Usyk", no record and no bouts, and a bio about Chris Staples (BoxRec 808714). Not a boxer profile. |

A removed slug is a 404 on the Worker.

## Slug coverage (the source)

| Check | Count |
| --- | --- |
| Slugs in the source | 5,571 |
| Present in D1 | 5,570 |
| Intentionally dropped | 1 |
| Missing from D1 | 0 |
| Dropped but present in D1 | 0 |
| In D1 but not in the source | 0 |


## Divisions against the reference

17 divisions: slug, name, `pro_division` and order, and every source `proDivision` among them: **0 mismatches**.

## Every boxer and bout against the source JSON

5,570 boxers and 109,541 bouts, 2,812,794 fields compared: **0 mismatches**.

The comparison checks every JSON key: each mapped key against its column by its rule (the same value; `""` or `null` as `NULL`; newline-separated names as a JSON array; `true`/`false` as `1`/`0`), and each unstored key against the documented drops (`boxrecWikiUrl`, the ten `amateur*` fields, a bout's `boxerId`, checked against the boxer's `boxrecId`). A key in neither list is a mismatch. Each bout is matched by its position in the list (`ordinal`), and its `opponent_boxer_id` must be the profile that the static site's opponent lookup links (`referenceOpponentSlugs`). Every D1 column is accounted for.

## Opponent links

11,213 of 109,541 bouts link to a profile (1 to the boxer themselves, as on the static site). Mismatches against the reference lookup are counted above, under `opponent_boxer_id`.

## Checksums

Content: every column except the database-assigned `boxers.imported_at` and `bouts.id`, to compare environments. State: every column, including those two. A re-import of the same source must leave the state unchanged.

| Table | Content sha256 | State sha256 |
| --- | --- | --- |
| divisions | `c87b5177605ad042` | `c87b5177605ad0427634a1e42c0f65e9f53bab3c2b4274eb000c38b0ddebfe4a` |
| boxers | `9b1ca0396b763cdd` | `55cd9c077ab33b99cc2b45f569cd2ec4b7fd16a8df465f6130203c670f0711d1` |
| bouts | `39b4e1f131a18dab` | `a67edffa2f87802500c7d074423c8611dc5c692df079c38ff04d1a47c658b3ff` |

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
| Name variants claimed by two boxers | 32 | The static rule: the later boxer in index order wins |
| Bouts linked to the boxer themselves | 1 | Kept, as on the static site |
| Staff values with two names | 3 | Split into a two-name array |
