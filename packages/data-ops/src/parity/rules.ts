// The parity check's own reading of a boxer JSON record (`from-pipeline/boxers.json`) against
// the D1 rows. It is written separately from
// the importer's mapping on purpose, so a mapping mistake shows up as a mismatch: never import
// from `../import/` here (a test enforces it).

/** How a JSON value is stored in D1. */
export type FieldRule =
  /** The same value: text, an integer or `null`. */
  | 'same'
  /** `''` and `null` are both `NULL`; any other value is the same. */
  | 'empty-is-null'
  /** Newline-separated names; D1 holds a JSON array of the trimmed, non-empty names. */
  | 'name-list'
  /** `true`/`false`; D1 holds `1`/`0`. */
  | 'boolean'

/** Every boxer JSON key that has a column, with that column and its rule. */
export const BOXER_FIELD_MAP: Readonly<Record<string, readonly [column: string, rule: FieldRule]>> =
  {
    id: ['id', 'same'],
    boxrecId: ['boxrec_id', 'same'],
    boxrecUrl: ['boxrec_url', 'same'],
    slug: ['slug', 'same'],
    name: ['name', 'same'],
    birthName: ['birth_name', 'empty-is-null'],
    nicknames: ['nicknames', 'empty-is-null'],
    avatarImage: ['avatar_image', 'empty-is-null'],
    residence: ['residence', 'empty-is-null'],
    birthPlace: ['birth_place', 'empty-is-null'],
    dateOfBirth: ['date_of_birth', 'empty-is-null'],
    gender: ['gender', 'empty-is-null'],
    nationality: ['nationality', 'empty-is-null'],
    height: ['height', 'empty-is-null'],
    reach: ['reach', 'empty-is-null'],
    stance: ['stance', 'empty-is-null'],
    bio: ['bio', 'empty-is-null'],
    promoters: ['promoters', 'name-list'],
    trainers: ['trainers', 'name-list'],
    managers: ['managers', 'name-list'],
    gym: ['gym', 'empty-is-null'],
    proDebutDate: ['pro_debut_date', 'empty-is-null'],
    proDivision: ['pro_division', 'empty-is-null'],
    proWins: ['pro_wins', 'same'],
    proWinsByKnockout: ['pro_wins_by_knockout', 'same'],
    proLosses: ['pro_losses', 'same'],
    proLossesByKnockout: ['pro_losses_by_knockout', 'same'],
    proDraws: ['pro_draws', 'same'],
    proStatus: ['pro_status', 'empty-is-null'],
    proTotalBouts: ['pro_total_bouts', 'same'],
    proTotalRounds: ['pro_total_rounds', 'same'],
    createdAt: ['created_at', 'empty-is-null'],
    updatedAt: ['updated_at', 'empty-is-null']
  }

/** Every bout JSON key that has a column. `boxerId` is checked against the boxer's `boxrecId`. */
export const BOUT_FIELD_MAP: Readonly<Record<string, readonly [column: string, rule: FieldRule]>> =
  {
    boxrecId: ['boxrec_id', 'same'],
    boutDate: ['bout_date', 'same'],
    opponentName: ['opponent_name', 'same'],
    opponentWeight: ['opponent_weight', 'empty-is-null'],
    opponentRecord: ['opponent_record', 'empty-is-null'],
    eventName: ['event_name', 'empty-is-null'],
    refereeName: ['referee_name', 'empty-is-null'],
    judge1Name: ['judge1_name', 'empty-is-null'],
    judge1Score: ['judge1_score', 'empty-is-null'],
    judge2Name: ['judge2_name', 'empty-is-null'],
    judge2Score: ['judge2_score', 'empty-is-null'],
    judge3Name: ['judge3_name', 'empty-is-null'],
    judge3Score: ['judge3_score', 'empty-is-null'],
    numRoundsScheduled: ['num_rounds_scheduled', 'same'],
    result: ['result', 'same'],
    resultMethod: ['result_method', 'empty-is-null'],
    resultRound: ['result_round', 'empty-is-null'],
    eventPageLink: ['event_page_link', 'empty-is-null'],
    boutPageLink: ['bout_page_link', 'same'],
    scorecardsPageLink: ['scorecards_page_link', 'empty-is-null'],
    titleFight: ['title_fight', 'boolean']
  }

/** JSON keys with no column (the #29 field map), plus `bouts`, which is checked row by row. */
export const UNSTORED_BOXER_KEYS: readonly string[] = [
  'boxrecWikiUrl',
  'amateurDebutDate',
  'amateurDivision',
  'amateurWins',
  'amateurWinsByKnockout',
  'amateurLosses',
  'amateurLossesByKnockout',
  'amateurDraws',
  'amateurStatus',
  'amateurTotalBouts',
  'amateurTotalRounds',
  'bouts'
]
export const UNSTORED_BOUT_KEYS: readonly string[] = ['boxerId']

/** Columns that no JSON key maps to: set by the database, or derived and checked separately. */
export const DERIVED_COLUMNS = {
  boxers: ['imported_at'],
  bouts: ['id', 'boxer_id', 'ordinal', 'opponent_boxer_id']
} as const

export type D1Value = string | number | null
export type D1Row = Record<string, D1Value>

export interface Mismatch {
  where: string
  field: string
  expected: unknown
  actual: unknown
}

function names(value: unknown): string[] {
  if (value === null || value === '') return []
  return String(value)
    .split('\n')
    .map(name => name.replace(/\r$/, '').trim())
    .filter(name => name !== '')
}

/** Whether a JSON value and a D1 value agree under `rule`. */
export function storedAs(rule: FieldRule, json: unknown, d1: D1Value | undefined): boolean {
  switch (rule) {
    case 'same':
      return d1 === json
    case 'empty-is-null':
      return json === '' || json === null ? d1 === null : d1 === json
    case 'boolean':
      return (json === true && d1 === 1) || (json === false && d1 === 0)
    case 'name-list': {
      if (typeof d1 !== 'string') return false
      let parsed: unknown
      try {
        parsed = JSON.parse(d1)
      } catch {
        return false
      }
      const expected = names(json)
      return (
        Array.isArray(parsed) &&
        parsed.length === expected.length &&
        parsed.every((name, index) => name === expected[index])
      )
    }
  }
}

function compareFields(
  where: string,
  json: Record<string, unknown>,
  row: D1Row,
  map: typeof BOXER_FIELD_MAP,
  unstored: readonly string[],
  mismatches: Mismatch[]
): number {
  for (const key of Object.keys(json)) {
    if (!(key in map) && !unstored.includes(key)) {
      mismatches.push({
        where,
        field: key,
        expected: 'a mapped or unstored key',
        actual: 'unknown'
      })
    }
  }
  let fields = 0
  for (const [key, [column, rule]] of Object.entries(map)) {
    fields++
    if (!(key in json)) {
      mismatches.push({ where, field: key, expected: 'present in the JSON', actual: 'missing' })
    } else if (!(column in row)) {
      mismatches.push({ where, field: column, expected: json[key], actual: 'no such column' })
    } else if (!storedAs(rule, json[key], row[column])) {
      mismatches.push({ where, field: column, expected: json[key], actual: row[column] })
    }
  }
  return fields
}

/**
 * Compares one boxer's JSON record with its D1 row and bout rows (any order), field by field.
 * `opponentId` gives the profile a bout's opponent name should link to, or `null`.
 */
export function compareBoxerRecord(
  record: Record<string, unknown>,
  boxer: D1Row | undefined,
  bouts: readonly D1Row[],
  opponentId: (opponentName: string) => number | null
): { fields: number; bouts: number; mismatches: Mismatch[] } {
  const mismatches: Mismatch[] = []
  const where = `boxer ${String(record.id)} (${String(record.slug)})`
  if (!boxer) {
    mismatches.push({ where, field: '(row)', expected: 'present', actual: 'missing' })
    return { fields: 0, bouts: 0, mismatches }
  }
  let fields = compareFields(where, record, boxer, BOXER_FIELD_MAP, UNSTORED_BOXER_KEYS, mismatches)

  const expected = Array.isArray(record.bouts) ? (record.bouts as Record<string, unknown>[]) : []
  if (record.bouts !== null && !Array.isArray(record.bouts)) {
    mismatches.push({ where, field: 'bouts', expected: 'an array or null', actual: record.bouts })
  }
  const byOrdinal = new Map(bouts.map(bout => [bout.ordinal, bout]))
  if (bouts.length !== expected.length || byOrdinal.size !== bouts.length) {
    mismatches.push({ where, field: 'bouts', expected: expected.length, actual: bouts.length })
  }
  expected.forEach((json, ordinal) => {
    const boutWhere = `bout ${String(record.id)}#${ordinal}`
    const row = byOrdinal.get(ordinal)
    if (!row) {
      mismatches.push({ where: boutWhere, field: '(row)', expected: 'present', actual: 'missing' })
      return
    }
    fields += compareFields(boutWhere, json, row, BOUT_FIELD_MAP, UNSTORED_BOUT_KEYS, mismatches)
    const derived: [string, unknown, D1Value | undefined][] = [
      ['boxerId', record.boxrecId, json.boxerId as D1Value],
      ['boxer_id', boxer.id, row.boxer_id],
      ['opponent_boxer_id', opponentId(String(json.opponentName)), row.opponent_boxer_id]
    ]
    for (const [field, want, got] of derived) {
      fields++
      if (want !== got) mismatches.push({ where: boutWhere, field, expected: want, actual: got })
    }
  })
  for (const ordinal of byOrdinal.keys()) {
    if (typeof ordinal !== 'number' || ordinal < 0 || ordinal >= expected.length) {
      mismatches.push({
        where: `bout ${String(record.id)}#${String(ordinal)}`,
        field: '(row)',
        expected: 'absent',
        actual: 'present'
      })
    }
  }
  return { fields, bouts: expected.length, mismatches }
}

/** D1 columns that neither a JSON key nor `DERIVED_COLUMNS` accounts for. */
export function unaccountedColumns(table: 'boxers' | 'bouts', row: D1Row): string[] {
  const map = table === 'boxers' ? BOXER_FIELD_MAP : BOUT_FIELD_MAP
  const known = new Set<string>([
    ...Object.values(map).map(([column]) => column),
    ...DERIVED_COLUMNS[table]
  ])
  return Object.keys(row).filter(column => !known.has(column))
}
