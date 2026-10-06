import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  countBoxers,
  getBoxerProfile,
  getDirectoryCounts,
  getDivisionBySlug,
  getHomepageData,
  getSitemapData,
  listBoxers,
  listBoxersByDivision,
  listDivisions
} from './queries'
import { bouts, boxers, divisions } from './schema'
import { createTestDatabase, explainQueryPlan, type TestDatabase } from './test-support'
import type { NewBout, NewBoxer, NewDivision } from './types'

const divisionRows: NewDivision[] = [
  { slug: 'heavy', name: 'Heavyweight', proDivision: 'heavy', sortOrder: 0 },
  { slug: 'light-heavy', name: 'Light Heavyweight', proDivision: 'light heavy', sortOrder: 1 },
  { slug: 'welter', name: 'Welterweight', proDivision: 'welter', sortOrder: 6 },
  { slug: 'minimum', name: 'Minimumweight', proDivision: 'minimum', sortOrder: 16 }
]

let nextId = 100
type BoxerFixture = NewBoxer & { id: number }

function boxer(name: string, fields: Partial<NewBoxer> = {}): BoxerFixture {
  const id = nextId++
  return {
    id,
    boxrecId: String(id * 10),
    boxrecUrl: `https://boxrec.com/en/box-pro/${id * 10}`,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    ...fields
  }
}

// "Lee Dorsey" and "LeRoy Pryor" tie on wins and bouts, as in the real data; binary
// collation would put LeRoy first, `localeCompare` (and NOCASE) put Lee first.
const boxerRows: BoxerFixture[] = [
  boxer('Ana Alpha', {
    proDivision: 'heavy',
    proWins: 40,
    proWinsByKnockout: 30,
    proLosses: 2,
    proTotalBouts: 42,
    nicknames: '"The Hammer"',
    managers: ['Ron Dove', 'Bob Kane'],
    bio: '<p>Bio</p>',
    updatedAt: '2025-08-08T18:56:21.604231'
  }),
  boxer('LeRoy Pryor', {
    proDivision: 'welter',
    proWins: 10,
    proLosses: 2,
    proTotalBouts: 12,
    proStatus: 'inactive'
  }),
  boxer('Lee Dorsey', {
    proDivision: 'welter',
    proWins: 10,
    proLosses: 2,
    proTotalBouts: 12,
    proStatus: 'inactive'
  }),
  boxer('Bob Bravo', { proDivision: 'heavy', proWins: 10, proLosses: 5, proTotalBouts: 15 }),
  boxer('Carl Charlie', {
    proDivision: 'light heavy',
    proWins: 31,
    proLosses: 5,
    proTotalBouts: 36,
    proStatus: 'inactive'
  }),
  boxer('Zero Zed')
]
const [ana, , lee, bob] = boxerRows as [BoxerFixture, BoxerFixture, BoxerFixture, BoxerFixture]

function bout(owner: BoxerFixture, ordinal: number, fields: Partial<NewBout> = {}): NewBout {
  const boxrecId = String(owner.id * 1000 + ordinal)
  return {
    boxerId: owner.id,
    ordinal,
    boxrecId,
    boutDate: 'Dec 55',
    opponentName: 'Unknown Opponent',
    result: 'win',
    boutPageLink: `https://boxrec.com/en/event/1/${boxrecId}`,
    ...fields
  }
}

// Inserted out of order: the profile must come back in ordinal order.
const boutRows: NewBout[] = [
  bout(ana, 2, { opponentName: 'Bob Bravo', opponentBoxerId: bob.id, result: 'draw' }),
  bout(ana, 0),
  bout(ana, 1, { opponentName: 'Lee Dorsey', opponentBoxerId: lee.id, titleFight: true }),
  bout(lee, 0, { opponentName: 'Ana Alpha', opponentBoxerId: ana.id, result: 'loss' })
]

async function seed({ db }: TestDatabase) {
  await db.insert(divisions).values(divisionRows)
  await db.insert(boxers).values(boxerRows)
  await db.insert(bouts).values(boutRows)
}

// What the pages compute today, from apps/web/lib/directory-pagination.ts and app/page.tsx.
function sortBoxersForDirectory(rows: NewBoxer[]): NewBoxer[] {
  return [...rows].sort(
    (a, b) =>
      (b.proWins ?? 0) - (a.proWins ?? 0) ||
      (b.proTotalBouts ?? 0) - (a.proTotalBouts ?? 0) ||
      a.name.localeCompare(b.name)
  )
}
const slugs = (rows: { slug: string }[]) => rows.map(row => row.slug)

describe('queries against the migrated schema', () => {
  let test: TestDatabase

  beforeAll(async () => {
    test = await createTestDatabase()
    await seed(test)
  })

  afterAll(async () => {
    await test?.dispose()
  })

  it('creates every table and index from the migrations', async () => {
    const { results } = await test.binding
      .prepare(
        "SELECT name FROM sqlite_master WHERE type IN ('table', 'index') AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name"
      )
      .all<{ name: string }>()
    expect(results.map(row => row.name)).toEqual([
      'bouts',
      'bouts_boxer_ordinal_unique',
      'bouts_opponent_boxer_id_idx',
      'boxers',
      'boxers_boxrec_id_unique',
      'boxers_directory_idx',
      'boxers_division_directory_idx',
      'boxers_search_idx',
      'boxers_slug_unique',
      'dataset_state',
      'divisions',
      'divisions_pro_division_unique',
      'divisions_sort_order_unique'
    ])
  })

  describe('getBoxerProfile', () => {
    it('returns the boxer with bouts in source order and opponent slugs', async () => {
      const profile = await getBoxerProfile(test.db, 'ana-alpha')

      expect(profile?.boxer).toMatchObject({
        id: ana.id,
        name: 'Ana Alpha',
        nicknames: '"The Hammer"',
        managers: ['Ron Dove', 'Bob Kane'],
        promoters: [],
        proStatus: null
      })
      expect(
        profile?.bouts.map(({ ordinal, opponentName, opponentSlug, result, titleFight }) => ({
          ordinal,
          opponentName,
          opponentSlug,
          result,
          titleFight
        }))
      ).toEqual([
        {
          ordinal: 0,
          opponentName: 'Unknown Opponent',
          opponentSlug: null,
          result: 'win',
          titleFight: false
        },
        {
          ordinal: 1,
          opponentName: 'Lee Dorsey',
          opponentSlug: 'lee-dorsey',
          result: 'win',
          titleFight: true
        },
        {
          ordinal: 2,
          opponentName: 'Bob Bravo',
          opponentSlug: 'bob-bravo',
          result: 'draw',
          titleFight: false
        }
      ])
    })

    it('returns a boxer with no bouts', async () => {
      const profile = await getBoxerProfile(test.db, 'zero-zed')
      expect(profile?.boxer.name).toBe('Zero Zed')
      expect(profile?.bouts).toEqual([])
    })

    it('returns null for an unknown slug', async () => {
      expect(await getBoxerProfile(test.db, 'nobody')).toBeNull()
    })
  })

  describe('listBoxers', () => {
    it('pages through every boxer in the order the directory uses today', async () => {
      const expected = slugs(sortBoxersForDirectory(boxerRows))
      expect(expected.indexOf('lee-dorsey')).toBeLessThan(expected.indexOf('leroy-pryor'))

      const first = await listBoxers(test.db, { page: 1, pageSize: 4 })
      const second = await listBoxers(test.db, { page: 2, pageSize: 4 })

      expect(first).toMatchObject({ page: 1, pageSize: 4, totalItems: 6, totalPages: 2 })
      expect([...slugs(first!.items), ...slugs(second!.items)]).toEqual(expected)
      expect(first!.items[0]).not.toHaveProperty('bio')
    })

    it('counts every boxer', async () => {
      expect(await countBoxers(test.db)).toBe(boxerRows.length)
    })

    it('defaults to 48 per page', async () => {
      const page = await listBoxers(test.db)
      expect(page).toMatchObject({ page: 1, pageSize: 48, totalItems: 6, totalPages: 1 })
    })

    it('returns null for a page out of range', async () => {
      expect(await listBoxers(test.db, { page: 3, pageSize: 4 })).toBeNull()
      expect(await listBoxers(test.db, { page: 0 })).toBeNull()
      expect(await listBoxers(test.db, { page: 1.5 })).toBeNull()
    })
  })

  describe('divisions', () => {
    it('lists every division in sort order with its boxer count', async () => {
      const rows = await listDivisions(test.db)
      expect(rows.map(({ slug, boxerCount }) => [slug, boxerCount])).toEqual([
        ['heavy', 2],
        ['light-heavy', 1],
        ['welter', 2],
        ['minimum', 0]
      ])
    })

    it('counts the boxers in all and per division', async () => {
      const counts = await getDirectoryCounts(test.db)

      expect(counts.totalBoxers).toBe(boxerRows.length)
      expect(counts.divisions.map(({ slug, boxerCount }) => [slug, boxerCount])).toEqual([
        ['heavy', 2],
        ['light-heavy', 1],
        ['welter', 2],
        ['minimum', 0]
      ])
    })

    it('finds a division by slug', async () => {
      expect(await getDivisionBySlug(test.db, 'light-heavy')).toEqual(divisionRows[1])
      expect(await getDivisionBySlug(test.db, 'light heavy')).toBeNull()
    })

    it('pages through a division in directory order', async () => {
      const page = await listBoxersByDivision(test.db, 'welter', { page: 1, pageSize: 1 })
      const next = await listBoxersByDivision(test.db, 'welter', { page: 2, pageSize: 1 })

      expect(page).toMatchObject({
        totalItems: 2,
        totalPages: 2,
        division: { name: 'Welterweight' }
      })
      expect([...slugs(page!.items), ...slugs(next!.items)]).toEqual(['lee-dorsey', 'leroy-pryor'])
    })

    it('returns page 1 of an empty division, and null past it or for an unknown one', async () => {
      expect(await listBoxersByDivision(test.db, 'minimum')).toMatchObject({
        items: [],
        totalItems: 0,
        totalPages: 1
      })
      expect(await listBoxersByDivision(test.db, 'minimum', { page: 2 })).toBeNull()
      expect(await listBoxersByDivision(test.db, 'super-duper')).toBeNull()
    })
  })

  describe('getHomepageData', () => {
    it('computes the same stats and top fighters as the homepage', async () => {
      const data = await getHomepageData(test.db, { featuredLimit: 3 })

      expect(data.stats).toEqual({
        totalBoxers: boxerRows.length,
        activeBoxers: boxerRows.filter(b => !b.proStatus || b.proStatus !== 'inactive').length,
        totalBouts: boxerRows.reduce((sum, b) => sum + (b.proTotalBouts || 0), 0),
        eliteBoxers: boxerRows.filter(
          b => b.proWins && b.proWins > 30 && (!b.proLosses || b.proLosses < 5)
        ).length
      })
      expect(data.stats).toEqual({
        totalBoxers: 6,
        activeBoxers: 3,
        totalBouts: 117,
        eliteBoxers: 1
      })
      expect(slugs(data.featuredBoxers)).toEqual(
        slugs(
          sortBoxersForDirectory(boxerRows)
            .filter(b => b.proWins && b.proTotalBouts)
            .slice(0, 3)
        )
      )
      expect(data.divisions.map(d => d.boxerCount)).toEqual([2, 1, 2, 0])
    })
  })

  describe('getSitemapData', () => {
    it('lists every boxer by slug with its division and updated_at, and the division counts', async () => {
      const data = await getSitemapData(test.db)

      expect(data.boxers).toEqual(
        [...boxerRows]
          .sort((a, b) => a.slug.localeCompare(b.slug))
          .map(row => ({
            slug: row.slug,
            updatedAt: row.updatedAt ?? null,
            divisionSlug: divisionRows.find(d => d.proDivision === row.proDivision)?.slug ?? null
          }))
      )
      expect(data.boxers.find(row => row.slug === 'ana-alpha')).toEqual({
        slug: 'ana-alpha',
        updatedAt: '2025-08-08T18:56:21.604231',
        divisionSlug: 'heavy'
      })
      expect(data.boxers.find(row => row.slug === 'zero-zed')?.divisionSlug).toBeNull()
      expect(data.divisions.map(({ slug, boxerCount }) => [slug, boxerCount])).toEqual([
        ['heavy', 2],
        ['light-heavy', 1],
        ['welter', 2],
        ['minimum', 0]
      ])
    })
  })

  describe('query plans', () => {
    /** The plan of the statement `run` sends whose SQL matches `pattern`. */
    async function planFor(run: () => Promise<unknown>, pattern: RegExp): Promise<string> {
      test.statements.length = 0
      await run()
      const statement = test.statements.find(({ sql }) => pattern.test(sql))
      if (!statement) throw new Error(`No statement matched ${pattern}`)
      return (await explainQueryPlan(test.binding, statement)).join('\n')
    }

    it('reads listings in index order, without a sort', async () => {
      const listing = await planFor(() => listBoxers(test.db, { page: 2, pageSize: 2 }), /order by/)
      const divisionListing = await planFor(
        () => listBoxersByDivision(test.db, 'heavy'),
        /order by/
      )

      expect(listing).toContain('USING INDEX boxers_directory_idx')
      expect(divisionListing).toContain(
        'USING INDEX boxers_division_directory_idx (pro_division=?)'
      )
      for (const plan of [listing, divisionListing]) expect(plan).not.toContain('TEMP B-TREE')
    })

    it('reads a profile by slug, then its bouts by boxer and ordinal', async () => {
      const profile = () => getBoxerProfile(test.db, 'ana-alpha')
      const boxerPlan = await planFor(profile, /from "boxers" where/)
      const boutPlan = await planFor(profile, /from "bouts"/)

      expect(boxerPlan).toContain('USING INDEX boxers_slug_unique (slug=?)')
      expect(boutPlan).toContain('USING INDEX bouts_boxer_ordinal_unique (boxer_id=?)')
      expect(boutPlan).not.toContain('TEMP B-TREE')
    })
  })
})

describe('foreign keys', () => {
  let test: TestDatabase

  beforeAll(async () => {
    test = await createTestDatabase()
    await seed(test)
  })

  afterAll(async () => {
    await test?.dispose()
  })

  it('rejects a boxer in an unknown division', async () => {
    const error = await test.db
      .insert(boxers)
      .values(boxer('New Comer', { proDivision: 'super duper' }))
      .then(
        () => null,
        (reason: Error) => reason
      )
    expect(String(error?.cause)).toMatch(/FOREIGN KEY constraint failed/)
  })

  it("deletes a boxer's bouts with the boxer and unlinks them as an opponent", async () => {
    await test.db.delete(boxers).where(eq(boxers.id, lee.id))

    expect(await test.db.select().from(bouts).where(eq(bouts.boxerId, lee.id))).toEqual([])
    const profile = await getBoxerProfile(test.db, 'ana-alpha')
    expect(profile?.bouts[1]).toMatchObject({
      opponentName: 'Lee Dorsey',
      opponentBoxerId: null,
      opponentSlug: null
    })
  })
})
