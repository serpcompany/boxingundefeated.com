import type { NewDivision } from '../types'
import type { SourceBout, SourceBoxer } from './source'

export type SqlValue = string | number | null
/** A row keyed by D1 column name, holding the value exactly as D1 stores and returns it. */
export type Row = Record<string, SqlValue>

export const DIVISION_COLUMNS = ['slug', 'name', 'pro_division', 'sort_order'] as const

/** Every `boxers` column except `imported_at`, which the database sets. */
export const BOXER_COLUMNS = [
  'id',
  'boxrec_id',
  'boxrec_url',
  'slug',
  'name',
  'birth_name',
  'nicknames',
  'avatar_image',
  'residence',
  'birth_place',
  'date_of_birth',
  'gender',
  'nationality',
  'height',
  'reach',
  'stance',
  'bio',
  'promoters',
  'trainers',
  'managers',
  'gym',
  'pro_debut_date',
  'pro_division',
  'pro_wins',
  'pro_wins_by_knockout',
  'pro_losses',
  'pro_losses_by_knockout',
  'pro_draws',
  'pro_total_bouts',
  'pro_total_rounds',
  'pro_status',
  'created_at',
  'updated_at'
] as const

/** Every `bouts` column except the surrogate `id`. `(boxer_id, ordinal)` is the row's key. */
export const BOUT_COLUMNS = [
  'boxer_id',
  'ordinal',
  'boxrec_id',
  'bout_date',
  'opponent_name',
  'opponent_boxer_id',
  'opponent_weight',
  'opponent_record',
  'event_name',
  'referee_name',
  'judge1_name',
  'judge1_score',
  'judge2_name',
  'judge2_score',
  'judge3_name',
  'judge3_score',
  'num_rounds_scheduled',
  'result',
  'result_method',
  'result_round',
  'event_page_link',
  'bout_page_link',
  'scorecards_page_link',
  'title_fight'
] as const

/**
 * Normalization rule 1: an empty string in a nullable text column is `NULL`. Today this affects
 * `proDivision`, `proStatus`, `proDebutDate`, `residence` and bouts' `eventName`; the pages
 * already render `''` and `null` the same way.
 */
export function emptyToNull(value: string | null | undefined): string | null {
  return value === undefined || value === null || value === '' ? null : value
}

/**
 * Normalization rule 2: `promoters`, `trainers` and `managers` are newline-separated names in the
 * source and a JSON `string[]` in D1 (`[]` when there are none), as Drizzle's JSON mode writes it.
 */
export function nameList(value: string | null): string {
  const names = (value ?? '')
    .split(/\r?\n/)
    .map(name => name.trim())
    .filter(Boolean)
  return JSON.stringify(names)
}

export function toDivisionRow(division: Required<NewDivision>): Row {
  return {
    slug: division.slug,
    name: division.name,
    pro_division: division.proDivision,
    sort_order: division.sortOrder
  }
}

/** Every other field is copied verbatim; `dateOfBirth` is free text and is not parsed. */
export function toBoxerRow(boxer: SourceBoxer): Row {
  return {
    id: boxer.id,
    boxrec_id: boxer.boxrecId,
    boxrec_url: boxer.boxrecUrl,
    slug: boxer.slug,
    name: boxer.name,
    birth_name: emptyToNull(boxer.birthName),
    nicknames: emptyToNull(boxer.nicknames),
    avatar_image: emptyToNull(boxer.avatarImage),
    residence: emptyToNull(boxer.residence),
    birth_place: emptyToNull(boxer.birthPlace),
    date_of_birth: emptyToNull(boxer.dateOfBirth),
    gender: emptyToNull(boxer.gender),
    nationality: emptyToNull(boxer.nationality),
    height: emptyToNull(boxer.height),
    reach: emptyToNull(boxer.reach),
    stance: emptyToNull(boxer.stance),
    bio: emptyToNull(boxer.bio),
    promoters: nameList(boxer.promoters),
    trainers: nameList(boxer.trainers),
    managers: nameList(boxer.managers),
    gym: emptyToNull(boxer.gym),
    pro_debut_date: emptyToNull(boxer.proDebutDate),
    pro_division: emptyToNull(boxer.proDivision),
    pro_wins: boxer.proWins,
    pro_wins_by_knockout: boxer.proWinsByKnockout,
    pro_losses: boxer.proLosses,
    pro_losses_by_knockout: boxer.proLossesByKnockout,
    pro_draws: boxer.proDraws,
    pro_total_bouts: boxer.proTotalBouts,
    pro_total_rounds: boxer.proTotalRounds,
    pro_status: emptyToNull(boxer.proStatus),
    created_at: emptyToNull(boxer.createdAt),
    updated_at: emptyToNull(boxer.updatedAt)
  }
}

/** `ordinal` is the position in the source array; `boxerId` becomes the `boxer_id` foreign key. */
export function toBoutRow(
  boxerId: number,
  ordinal: number,
  bout: SourceBout,
  opponentBoxerId: number | null
): Row {
  return {
    boxer_id: boxerId,
    ordinal,
    boxrec_id: bout.boxrecId,
    bout_date: bout.boutDate,
    opponent_name: bout.opponentName,
    opponent_boxer_id: opponentBoxerId,
    opponent_weight: emptyToNull(bout.opponentWeight),
    opponent_record: emptyToNull(bout.opponentRecord),
    event_name: emptyToNull(bout.eventName),
    referee_name: emptyToNull(bout.refereeName),
    judge1_name: emptyToNull(bout.judge1Name),
    judge1_score: emptyToNull(bout.judge1Score),
    judge2_name: emptyToNull(bout.judge2Name),
    judge2_score: emptyToNull(bout.judge2Score),
    judge3_name: emptyToNull(bout.judge3Name),
    judge3_score: emptyToNull(bout.judge3Score),
    num_rounds_scheduled: bout.numRoundsScheduled,
    result: bout.result,
    result_method: emptyToNull(bout.resultMethod),
    result_round: emptyToNull(bout.resultRound),
    event_page_link: emptyToNull(bout.eventPageLink),
    bout_page_link: bout.boutPageLink,
    scorecards_page_link: emptyToNull(bout.scorecardsPageLink),
    title_fight: bout.titleFight ? 1 : 0
  }
}
