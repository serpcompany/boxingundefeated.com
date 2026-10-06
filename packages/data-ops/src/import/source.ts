import { BOUT_RESULTS, GENDERS, PRO_STATUSES, STANCES } from '../schema'
import { DIVISIONS } from './divisions'

/** One record of `from-pipeline/boxers.json`, as validated by `validateSource`. */
export interface SourceBoxer {
  id: number
  boxrecId: string
  boxrecUrl: string
  boxrecWikiUrl: null
  slug: string
  name: string
  birthName: string | null
  nicknames: string | null
  avatarImage: string | null
  residence: string | null
  birthPlace: string | null
  dateOfBirth: string | null
  gender: string | null
  nationality: string | null
  height: string | null
  reach: string | null
  stance: string | null
  bio: string | null
  promoters: string | null
  trainers: string | null
  managers: string | null
  gym: string | null
  proDebutDate: string | null
  proDivision: string | null
  proWins: number
  proWinsByKnockout: number
  proLosses: number
  proLossesByKnockout: number
  proDraws: number
  proStatus: string | null
  proTotalBouts: number
  proTotalRounds: number | null
  createdAt: string | null
  updatedAt: string | null
  bouts: SourceBout[] | null
  // The amateur fields are validated as present and then dropped (see the #29 field map).
  [dropped: string]: unknown
}

export interface SourceBout {
  boxerId: string
  boxrecId: string
  boutDate: string
  opponentName: string
  opponentWeight: string | null
  opponentRecord: string | null
  eventName: string | null
  refereeName: string | null
  judge1Name: string | null
  judge1Score: string | null
  judge2Name: string | null
  judge2Score: string | null
  judge3Name: string | null
  judge3Score: string | null
  numRoundsScheduled: number | null
  result: string
  resultMethod: string | null
  resultRound: string | null
  eventPageLink: string | null
  boutPageLink: string
  scorecardsPageLink: string | null
  titleFight: boolean
}

/**
 * Records the importer skips on purpose. Each one is listed in the parity report, and its URL
 * stops resolving once pages read from D1 (#10).
 */
export const INTENTIONAL_DROPS: Readonly<Record<string, string>> = {
  world:
    'Misparsed pipeline row: name "World", nationality "Usyk", no record and no bouts, and a ' +
    'bio about Chris Staples (BoxRec 808714). Not a boxer profile.'
}

/** Kebab-case only, so no slug can end in a file extension (URL trailing-slash standard). */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

type Rule =
  | 'id'
  | 'text'
  | 'text?'
  | 'count'
  | 'int?'
  | 'bool'
  | 'null'
  | 'dropped'
  | 'bouts'
  | readonly (string | null)[]

const optional = <T extends string>(values: readonly T[]) => [...values, '', null] as const

const BOXER_RULES: Record<string, Rule> = {
  id: 'id',
  boxrecId: 'text',
  boxrecUrl: 'text',
  boxrecWikiUrl: 'null',
  slug: 'text',
  name: 'text',
  birthName: 'text?',
  nicknames: 'text?',
  avatarImage: 'text?',
  residence: 'text?',
  birthPlace: 'text?',
  dateOfBirth: 'text?',
  gender: optional(GENDERS),
  nationality: 'text?',
  height: 'text?',
  reach: 'text?',
  stance: optional(STANCES),
  bio: 'text?',
  promoters: 'text?',
  trainers: 'text?',
  managers: 'text?',
  gym: 'text?',
  proDebutDate: 'text?',
  proDivision: optional(DIVISIONS.map(division => division.proDivision)),
  proWins: 'count',
  proWinsByKnockout: 'count',
  proLosses: 'count',
  proLossesByKnockout: 'count',
  proDraws: 'count',
  proStatus: optional(PRO_STATUSES),
  proTotalBouts: 'count',
  proTotalRounds: 'int?',
  amateurDebutDate: 'dropped',
  amateurDivision: 'dropped',
  amateurWins: 'dropped',
  amateurWinsByKnockout: 'dropped',
  amateurLosses: 'dropped',
  amateurLossesByKnockout: 'dropped',
  amateurDraws: 'dropped',
  amateurStatus: 'dropped',
  amateurTotalBouts: 'dropped',
  amateurTotalRounds: 'dropped',
  bouts: 'bouts',
  createdAt: 'text?',
  updatedAt: 'text?'
}

const BOUT_RULES: Record<string, Rule> = {
  boxerId: 'text',
  boxrecId: 'text',
  boutDate: 'text',
  opponentName: 'text',
  opponentWeight: 'text?',
  opponentRecord: 'text?',
  eventName: 'text?',
  refereeName: 'text?',
  judge1Name: 'text?',
  judge1Score: 'text?',
  judge2Name: 'text?',
  judge2Score: 'text?',
  judge3Name: 'text?',
  judge3Score: 'text?',
  numRoundsScheduled: 'int?',
  result: BOUT_RESULTS,
  resultMethod: 'text?',
  resultRound: 'text?',
  eventPageLink: 'text?',
  boutPageLink: 'text',
  scorecardsPageLink: 'text?',
  titleFight: 'bool'
}

/** The source fields that have no column (#29 field map). `boxerId` becomes `bouts.boxer_id`. */
export const DROPPED_BOXER_FIELDS = [
  'boxrecWikiUrl',
  ...Object.keys(BOXER_RULES).filter(key => BOXER_RULES[key] === 'dropped')
]
export const DROPPED_BOUT_FIELDS = ['boxerId']

function checkValue(rule: Rule, value: unknown): string | null {
  if (Array.isArray(rule)) {
    return rule.includes(value as string) ? null : `must be one of ${JSON.stringify(rule)}`
  }
  switch (rule) {
    case 'id':
      return Number.isSafeInteger(value) && (value as number) > 0
        ? null
        : 'must be a positive integer'
    case 'text':
      return typeof value === 'string' && value.trim() !== '' ? null : 'must be a non-empty string'
    case 'text?':
      return value === null || typeof value === 'string' ? null : 'must be a string or null'
    case 'count':
      return Number.isSafeInteger(value) && (value as number) >= 0
        ? null
        : 'must be a non-negative integer'
    case 'int?':
      return value === null || Number.isSafeInteger(value) ? null : 'must be an integer or null'
    case 'bool':
      return typeof value === 'boolean' ? null : 'must be a boolean'
    case 'null':
      return value === null ? null : 'must be null (the field has no column)'
    case 'bouts':
      return value === null || Array.isArray(value) ? null : 'must be an array or null'
    case 'dropped':
      return null
  }
  return null
}

function checkRecord(
  record: unknown,
  rules: Record<string, Rule>,
  where: string,
  errors: string[]
): record is Record<string, unknown> {
  if (typeof record !== 'object' || record === null || Array.isArray(record)) {
    errors.push(`${where}: must be an object`)
    return false
  }
  const fields = record as Record<string, unknown>
  for (const key of Object.keys(fields)) {
    if (!(key in rules)) errors.push(`${where}: unknown field \`${key}\``)
  }
  for (const [key, rule] of Object.entries(rules)) {
    if (!(key in fields)) {
      errors.push(`${where}: missing field \`${key}\``)
      continue
    }
    const value = fields[key]
    const problem = checkValue(rule, value)
    if (problem) errors.push(`${where}: \`${key}\` ${problem} (got ${JSON.stringify(value)})`)
    if (typeof value === 'string' && value.includes('\u0000')) {
      errors.push(`${where}: \`${key}\` contains a NUL character`)
    }
  }
  return true
}

export class SourceValidationError extends Error {
  constructor(readonly errors: string[]) {
    const shown = errors.slice(0, 20).map(error => `  - ${error}`)
    const more = errors.length > 20 ? [`  … and ${errors.length - 20} more`] : []
    super([`The source has ${errors.length} problem(s):`, ...shown, ...more].join('\n'))
    this.name = 'SourceValidationError'
  }
}

/**
 * Checks every record and bout against the field map: known fields only, the column types and
 * value sets, unique ids, BoxRec ids and slugs, and kebab-case slugs. Throws a
 * `SourceValidationError` listing every problem.
 */
export function validateSource(input: unknown): SourceBoxer[] {
  if (!Array.isArray(input)) throw new SourceValidationError(['the source must be a JSON array'])
  const errors: string[] = []
  const seen = {
    id: new Map<unknown, number>(),
    boxrecId: new Map<unknown, number>(),
    slug: new Map<unknown, number>()
  }
  input.forEach((record, index) => {
    const label = `record ${index}${typeof record?.slug === 'string' ? ` (${record.slug})` : ''}`
    if (!checkRecord(record, BOXER_RULES, label, errors)) return
    for (const key of ['id', 'boxrecId', 'slug'] as const) {
      const first = seen[key].get(record[key])
      if (first !== undefined) {
        errors.push(
          `${label}: duplicate \`${key}\` ${JSON.stringify(record[key])} (record ${first})`
        )
      } else {
        seen[key].set(record[key], index)
      }
    }
    if (typeof record.slug === 'string' && !SLUG_PATTERN.test(record.slug)) {
      errors.push(`${label}: slug must be kebab-case [a-z0-9-] with no file extension`)
    }
    const bouts = Array.isArray(record.bouts) ? record.bouts : []
    bouts.forEach((bout: unknown, ordinal: number) => {
      const where = `${label} bout ${ordinal}`
      if (!checkRecord(bout, BOUT_RULES, where, errors)) return
      if (bout.boxerId !== record.boxrecId) {
        errors.push(`${where}: \`boxerId\` ${JSON.stringify(bout.boxerId)} is not the boxer's`)
      }
    })
  })
  if (errors.length > 0) throw new SourceValidationError(errors)
  return input as SourceBoxer[]
}
