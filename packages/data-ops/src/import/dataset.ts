import { DIVISIONS } from './divisions'
import { buildOpponentIndex, directoryIndexOrder } from './opponents'
import { type Row, toBoutRow, toBoxerRow, toDivisionRow } from './rows'
import { INTENTIONAL_DROPS, type SourceBoxer, validateSource } from './source'

export interface DroppedRecord {
  slug: string
  boxrecId: string
  name: string
  bouts: number
  reason: string
}

/** The source data quirks the parity report lists (#9). */
export interface DataQuirks {
  /** Source `''` values written as `NULL`, per source field. */
  emptyStringsToNull: Record<string, number>
  /** `dateOfBirth` values copied as free text. */
  freeTextDatesOfBirth: number
  placeholderAvatars: number
  /** Bout lists that stop at exactly 100 entries, where the pipeline truncated them. */
  truncatedBoutLists: number
  boxersWithoutBouts: number
  /** Bouts listed from both sides because both boxers are in the dataset (pairs). */
  doubledBouts: number
  /** Bouts whose opponent resolves to a profile, and those that resolve to the boxer themselves. */
  opponentLinks: number
  selfLinks: number
  /** Name variants that more than one boxer claims (the later one in index order wins). */
  contestedOpponentNames: number
  /** Manager, promoter and trainer values holding more than one name. */
  multiNameStaffValues: number
}

export interface ImportDataset {
  divisions: Row[]
  /** Ordered by `id`. */
  boxers: Row[]
  /** Ordered by `boxer_id`, then `ordinal`. */
  bouts: Row[]
  /** Kept source records, ordered by `id`. */
  records: SourceBoxer[]
  dropped: DroppedRecord[]
  quirks: DataQuirks
  /** The source totals, before drops. */
  sourceCounts: { boxers: number; bouts: number }
}

const PLACEHOLDER_AVATAR = /v6-avatar\.svg/
/** The pipeline's cap on a boxer's bout list. */
export const PIPELINE_BOUT_LIMIT = 100

function countEmptyStrings(records: SourceBoxer[]): Record<string, number> {
  const counts: Record<string, number> = {}
  const add = (field: string) => {
    counts[field] = (counts[field] ?? 0) + 1
  }
  for (const record of records) {
    for (const [field, value] of Object.entries(record)) {
      if (value === '' && !field.startsWith('amateur')) add(field)
    }
    for (const bout of record.bouts ?? []) {
      for (const [field, value] of Object.entries(bout)) {
        if (value === '') add(`bouts.${field}`)
      }
    }
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)))
}

/**
 * Validates the source, applies the intentional drops and maps every kept record to D1 rows,
 * resolving each bout's opponent with today's name matching. Deterministic for a given input.
 */
export function prepareDataset(
  input: unknown,
  drops: Readonly<Record<string, string>> = INTENTIONAL_DROPS
): ImportDataset {
  const all = validateSource(input)
  const dropped: DroppedRecord[] = []
  const kept: SourceBoxer[] = []
  for (const record of all) {
    const reason = drops[record.slug]
    if (reason === undefined) {
      kept.push(record)
      continue
    }
    dropped.push({
      slug: record.slug,
      boxrecId: record.boxrecId,
      name: record.name,
      bouts: record.bouts?.length ?? 0,
      reason
    })
  }

  const opponents = buildOpponentIndex(directoryIndexOrder(kept))
  const idBySlug = new Map(kept.map(record => [record.slug, record.id]))
  const records = [...kept].sort((a, b) => a.id - b.id)
  const boxers = records.map(toBoxerRow)
  const bouts: Row[] = []
  const boutSides = new Map<string, number>()
  let selfLinks = 0
  let opponentLinks = 0
  for (const record of records) {
    ;(record.bouts ?? []).forEach((bout, ordinal) => {
      const slug = opponents.lookup(bout.opponentName)
      const opponentId = slug === undefined ? null : (idBySlug.get(slug) ?? null)
      if (opponentId !== null) opponentLinks++
      if (opponentId === record.id) selfLinks++
      boutSides.set(bout.boxrecId, (boutSides.get(bout.boxrecId) ?? 0) + 1)
      bouts.push(toBoutRow(record.id, ordinal, bout, opponentId))
    })
  }

  const quirks: DataQuirks = {
    emptyStringsToNull: countEmptyStrings(all),
    freeTextDatesOfBirth: all.filter(record => record.dateOfBirth).length,
    placeholderAvatars: all.filter(record => PLACEHOLDER_AVATAR.test(record.avatarImage ?? ''))
      .length,
    truncatedBoutLists: all.filter(record => record.bouts?.length === PIPELINE_BOUT_LIMIT).length,
    boxersWithoutBouts: all.filter(record => !record.bouts?.length).length,
    doubledBouts: [...boutSides.values()].filter(sides => sides > 1).length,
    opponentLinks,
    selfLinks,
    contestedOpponentNames: opponents.collisions,
    multiNameStaffValues: all.filter(record =>
      [record.promoters, record.trainers, record.managers].some(value => value?.includes('\n'))
    ).length
  }

  return {
    divisions: DIVISIONS.map(toDivisionRow),
    boxers,
    bouts,
    records,
    dropped,
    quirks,
    sourceCounts: {
      boxers: all.length,
      bouts: all.reduce((total, record) => total + (record.bouts?.length ?? 0), 0)
    }
  }
}
