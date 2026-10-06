import { and, asc, count, desc, eq, getTableColumns, gt, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import type { Database } from './client'
import { bouts, boxers, datasetState, divisions } from './schema'
import { SEARCH_NAME_KEY, SEARCH_RESULT_LIMIT, SEARCH_TEXT_KEY, searchTerms } from './search'
import type { Bout, Boxer, DatasetState, Division } from './types'

/** Boxers per listing page, as on `/boxers/` and `/divisions/<division>/` today. */
export const BOXER_PAGE_SIZE = 48
export const FEATURED_BOXER_COUNT = 6

// The directory order: most wins, then most bouts, then name. NOCASE matches the
// `localeCompare` order the pages use for every name in today's data, and the
// `boxers_*directory_idx` indexes are declared with the same terms so SQLite reads
// pages in index order instead of sorting.
const directoryOrder = [
  desc(boxers.proWins),
  desc(boxers.proTotalBouts),
  sql`${boxers.name} COLLATE NOCASE`
]

/** The columns a listing card shows: no bio, no bouts. */
export const boxerListColumns = {
  id: boxers.id,
  slug: boxers.slug,
  name: boxers.name,
  nicknames: boxers.nicknames,
  avatarImage: boxers.avatarImage,
  nationality: boxers.nationality,
  proDivision: boxers.proDivision,
  proStatus: boxers.proStatus,
  proWins: boxers.proWins,
  proWinsByKnockout: boxers.proWinsByKnockout,
  proLosses: boxers.proLosses,
  proDraws: boxers.proDraws,
  proTotalBouts: boxers.proTotalBouts
}

export type BoxerListItem = Pick<Boxer, keyof typeof boxerListColumns>
export type BoutWithOpponent = Bout & { opponentSlug: string | null }
export type DivisionWithCount = Division & { boxerCount: number }

export interface BoxerProfile {
  boxer: Boxer
  /** In source order. */
  bouts: BoutWithOpponent[]
}

export interface BoxerPage {
  items: BoxerListItem[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface DivisionBoxerPage extends BoxerPage {
  division: Division
}

export interface HomepageStats {
  totalBoxers: number
  /** Boxers whose status is not `inactive`, including those with no status. */
  activeBoxers: number
  /** The sum of every boxer's `pro_total_bouts`. */
  totalBouts: number
  /** More than 30 wins and fewer than 5 losses. */
  eliteBoxers: number
}

export interface HomepageData {
  stats: HomepageStats
  /** The most wins, among boxers with at least one win and one bout. */
  featuredBoxers: BoxerListItem[]
  divisions: DivisionWithCount[]
}

export interface PageOptions {
  /** 1-based. */
  page?: number
  pageSize?: number
}

export function getTotalPages(totalItems: number, pageSize = BOXER_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(totalItems / pageSize))
}

function isValidPage(page: number, pageSize: number): boolean {
  return Number.isInteger(page) && page >= 1 && Number.isInteger(pageSize) && pageSize >= 1
}

function toPage(
  items: BoxerListItem[],
  totalItems: number,
  page: number,
  pageSize: number
): BoxerPage | null {
  const totalPages = getTotalPages(totalItems, pageSize)
  if (page > totalPages) return null
  return { items, page, pageSize, totalItems, totalPages }
}

const owner = alias(boxers, 'owner')
const opponent = alias(boxers, 'opponent')

/**
 * A boxer and their bouts, each with the opponent's slug when the opponent has a profile.
 * One round trip: both statements are keyed by the slug and sent as a D1 batch.
 */
export async function getBoxerProfile(db: Database, slug: string): Promise<BoxerProfile | null> {
  const [boxerRows, boutRows] = await db.batch([
    db.select().from(boxers).where(eq(boxers.slug, slug)).limit(1),
    db
      .select({ ...getTableColumns(bouts), opponentSlug: opponent.slug })
      .from(bouts)
      .innerJoin(owner, eq(owner.id, bouts.boxerId))
      .leftJoin(opponent, eq(opponent.id, bouts.opponentBoxerId))
      .where(eq(owner.slug, slug))
      .orderBy(asc(bouts.ordinal))
  ])
  const boxer = boxerRows[0]
  if (!boxer) return null
  return { boxer, bouts: boutRows }
}

/** `/boxers/` and `/boxers/page/<n>/`. Null when the page is out of range. */
export async function listBoxers(
  db: Database,
  { page = 1, pageSize = BOXER_PAGE_SIZE }: PageOptions = {}
): Promise<BoxerPage | null> {
  if (!isValidPage(page, pageSize)) return null
  const [[total], items] = await db.batch([
    db.select({ value: count() }).from(boxers),
    db
      .select(boxerListColumns)
      .from(boxers)
      .orderBy(...directoryOrder)
      .limit(pageSize)
      .offset((page - 1) * pageSize)
  ])
  return toPage(items, total?.value ?? 0, page, pageSize)
}

export async function countBoxers(db: Database): Promise<number> {
  const [total] = await db.select({ value: count() }).from(boxers)
  return total?.value ?? 0
}

/** Every division in display order, with its boxer count (`/divisions/`). */
export async function listDivisions(db: Database): Promise<DivisionWithCount[]> {
  return divisionsWithCounts(db)
}

export interface DirectoryCounts {
  totalBoxers: number
  /** In display order. */
  divisions: DivisionWithCount[]
}

/**
 * How many boxers there are in all and per division, which set the pagination of `/boxers/` and
 * each division (the HTML sitemap). One round trip.
 */
export async function getDirectoryCounts(db: Database): Promise<DirectoryCounts> {
  const [[total], divisionRows] = await db.batch([
    db.select({ value: count() }).from(boxers),
    divisionsWithCounts(db)
  ])
  return { totalBoxers: total?.value ?? 0, divisions: divisionRows }
}

function divisionsWithCounts(db: Database) {
  return db
    .select({ ...getTableColumns(divisions), boxerCount: count(boxers.id) })
    .from(divisions)
    .leftJoin(boxers, eq(boxers.proDivision, divisions.proDivision))
    .groupBy(divisions.slug)
    .orderBy(asc(divisions.sortOrder))
}

export async function getDivisionBySlug(db: Database, slug: string): Promise<Division | null> {
  const [division] = await db.select().from(divisions).where(eq(divisions.slug, slug)).limit(1)
  return division ?? null
}

/**
 * `/divisions/<division>/` and its `/page/<n>/` pages, in directory order. Null for an unknown
 * division or an out-of-range page.
 */
export async function listBoxersByDivision(
  db: Database,
  divisionSlug: string,
  { page = 1, pageSize = BOXER_PAGE_SIZE }: PageOptions = {}
): Promise<DivisionBoxerPage | null> {
  if (!isValidPage(page, pageSize)) return null
  const inDivision = eq(divisions.slug, divisionSlug)
  const [divisionRows, [total], items] = await db.batch([
    db.select().from(divisions).where(inDivision).limit(1),
    db
      .select({ value: count() })
      .from(boxers)
      .innerJoin(divisions, eq(divisions.proDivision, boxers.proDivision))
      .where(inDivision),
    db
      .select(boxerListColumns)
      .from(boxers)
      .innerJoin(divisions, eq(divisions.proDivision, boxers.proDivision))
      .where(inDivision)
      .orderBy(...directoryOrder)
      .limit(pageSize)
      .offset((page - 1) * pageSize)
  ])
  const division = divisionRows[0]
  if (!division) return null
  const result = toPage(items, total?.value ?? 0, page, pageSize)
  return result && { ...result, division }
}

/** The homepage's stat cards, top fighters and division counts, in one round trip. */
export async function getHomepageData(
  db: Database,
  { featuredLimit = FEATURED_BOXER_COUNT }: { featuredLimit?: number } = {}
): Promise<HomepageData> {
  const [[stats], featuredBoxers, divisionRows] = await db.batch([
    db
      .select({
        totalBoxers: count(),
        activeBoxers: sql<number>`coalesce(sum(${boxers.proStatus} IS NULL OR ${boxers.proStatus} <> 'inactive'), 0)`,
        totalBouts: sql<number>`coalesce(sum(${boxers.proTotalBouts}), 0)`,
        eliteBoxers: sql<number>`coalesce(sum(${boxers.proWins} > 30 AND ${boxers.proLosses} < 5), 0)`
      })
      .from(boxers),
    db
      .select(boxerListColumns)
      .from(boxers)
      .where(and(gt(boxers.proWins, 0), gt(boxers.proTotalBouts, 0)))
      .orderBy(...directoryOrder)
      .limit(featuredLimit),
    divisionsWithCounts(db)
  ])
  return {
    stats: stats ?? { totalBoxers: 0, activeBoxers: 0, totalBouts: 0, eliteBoxers: 0 },
    featuredBoxers,
    divisions: divisionRows
  }
}

/**
 * Whether D1 holds a complete import (`dataset_state`), and when the last one finished: null when
 * no import has started. One row, read by primary key.
 */
export async function getDatasetState(
  db: Database
): Promise<Pick<DatasetState, 'version' | 'importing' | 'completedAt'> | null> {
  const [state] = await db
    .select({
      version: datasetState.version,
      importing: datasetState.importing,
      completedAt: datasetState.completedAt
    })
    .from(datasetState)
    .where(eq(datasetState.id, 1))
    .limit(1)
  return state ?? null
}

/** The columns a search result shows. */
export const boxerSearchColumns = {
  slug: boxers.slug,
  name: boxers.name,
  nicknames: boxers.nicknames,
  nationality: boxers.nationality,
  proDivision: boxers.proDivision,
  proWins: boxers.proWins,
  proLosses: boxers.proLosses,
  proDraws: boxers.proDraws
}

export type BoxerSearchResult = Pick<Boxer, keyof typeof boxerSearchColumns>

export interface BoxerSearch {
  /** The query's terms (`searchTerms`), joined by spaces: what was searched for. */
  query: string
  /** Best match first. At most `limit`. */
  results: BoxerSearchResult[]
  /** More boxers match than `results` holds. */
  truncated: boolean
}

/**
 * Boxers whose name, nicknames, nationality or division contain every term of `query`
 * (`searchTerms`), best first: the name is the query, then starts with it, then has a word that
 * starts with it, then contains it, then everything else (a nickname, the nationality or the
 * division); within each, the directory order.
 *
 * One statement. `keys` names the two key expressions once, as `boxers_search_idx` declares them,
 * so SQLite reads them from the index; `hits` filters and ranks on that covering index alone
 * (about 5,600 short entries), and only the returned rows are read from the table. Terms hold
 * only letters and digits, and the tests are `instr()` substring tests: no pattern syntax, and no
 * pattern length limit (D1 caps `LIKE` patterns at 50 bytes).
 */
export async function searchBoxers(
  db: Database,
  query: string,
  { limit = SEARCH_RESULT_LIMIT }: { limit?: number } = {}
): Promise<BoxerSearch> {
  const terms = searchTerms(query)
  if (terms.length === 0 || !Number.isInteger(limit) || limit < 1) {
    return { query: terms.join(' '), results: [], truncated: false }
  }
  const phrase = terms.join(' ')
  const keys = db.$with('keys').as(
    db
      .select({
        id: boxers.id,
        textKey: sql<string>`${sql.raw(SEARCH_TEXT_KEY)}`.as('text_key'),
        nameKey: sql<string>`${sql.raw(SEARCH_NAME_KEY)}`.as('name_key'),
        proWins: boxers.proWins,
        proTotalBouts: boxers.proTotalBouts,
        name: boxers.name
      })
      .from(boxers)
  )
  const name = sql`${keys.nameKey}`
  const tier = sql<number>`CASE
    WHEN ${name} = ${phrase} THEN 0
    WHEN instr(${name}, ${phrase}) = 1 THEN 1
    WHEN instr(' ' || ${name}, ${` ${phrase}`}) > 0 THEN 2
    WHEN instr(${name}, ${phrase}) > 0 THEN 3
    ELSE 4 END`.as('tier')
  const hits = db.$with('hits').as(
    db
      .select({ id: keys.id, tier })
      .from(keys)
      .where(and(...terms.map(term => sql`instr(${keys.textKey}, ${term}) > 0`)))
      .orderBy(
        sql`tier`,
        desc(keys.proWins),
        desc(keys.proTotalBouts),
        sql`${keys.name} COLLATE NOCASE`
      )
      .limit(limit + 1)
  )
  const rows = await db
    .with(keys, hits)
    .select(boxerSearchColumns)
    .from(hits)
    .innerJoin(boxers, eq(boxers.id, hits.id))
    .orderBy(sql`${hits.tier}`, ...directoryOrder)
  return { query: phrase, results: rows.slice(0, limit), truncated: rows.length > limit }
}
