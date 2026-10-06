import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { searchBoxers } from './queries'
import { boxers, divisions } from './schema'
import {
  SEARCH_MAX_TERMS,
  SEARCH_NAME_KEY,
  SEARCH_RESULT_LIMIT,
  SEARCH_TEXT_KEY,
  SQL_FOLDS,
  searchKeyWords,
  searchTerms
} from './search'
import { createTestDatabase, explainQueryPlan, type TestDatabase } from './test-support'
import type { NewBoxer } from './types'

const FIXTURE = resolve(import.meta.dirname, '../../../d1/fixtures/boxers.sample.json')

/** A few rows per statement: D1 binds at most 100 values to one. */
async function insertBoxers({ db }: TestDatabase, records: NewBoxer[]) {
  for (let index = 0; index < records.length; index += 4) {
    await db.insert(boxers).values(records.slice(index, index + 4))
  }
}

describe('searchTerms', () => {
  it.each([
    ['Floyd Mayweather', ['floyd', 'mayweather']],
    ['  FLOYD   mayweather  ', ['floyd', 'mayweather']],
    ["O'Neil", ['oneil']],
    ['O’Neil', ['oneil']],
    ['Muñoz', ['munoz']],
    ['Jean-Pierre', ['jean', 'pierre']],
    ['"Money,Pretty Boy"', ['money', 'pretty', 'boy']],
    ['ali ali', ['ali']],
    ['50%_off', ['50', 'off']],
    ['%', []],
    ['_', []],
    ['   ', []],
    ['"*" OR NEAR(a b)', ['or', 'near', 'a', 'b']]
  ])('%j searches for %j', (query, terms) => {
    expect(searchTerms(query)).toEqual(terms)
  })

  it(`keeps the first ${SEARCH_MAX_TERMS} distinct terms`, () => {
    expect(searchTerms('a b c d e f g h')).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
  })

  it('folds accented letters both ways, as the stored keys do', () => {
    expect(searchTerms('Curaçao Côte D’Ivoire')).toEqual(['curacao', 'cote', 'divoire'])
    expect(searchTerms('Łukasz Straße Ærø İzmir')).toEqual(['lukasz', 'strasse', 'aero', 'izmir'])
    expect(SQL_FOLDS.get('Ç')).toBe('c')
    expect(SQL_FOLDS.size).toBe(62)
    expect(searchTerms('Chávez')).toEqual(searchTerms('Cha\u0301vez'))
  })
})

let nextId = 1
function boxer(name: string, fields: Partial<NewBoxer> = {}): NewBoxer {
  const id = nextId++
  return {
    id,
    boxrecId: String(id),
    boxrecUrl: `https://boxrec.com/en/box-pro/${id}`,
    slug: name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
    name,
    nationality: 'USA',
    ...fields
  }
}

const rows: NewBoxer[] = [
  boxer('Floyd Mayweather Jr', {
    nicknames: '"Money,Pretty Boy"',
    proDivision: 'welter',
    proWins: 50,
    proTotalBouts: 50
  }),
  boxer('Floyd Mayweather Sr', { proDivision: 'welter', proWins: 28, proTotalBouts: 35 }),
  boxer('Floyd Patterson', { proDivision: 'heavy', proWins: 55, proTotalBouts: 64 }),
  boxer('Pinklon Floyd Thomas', { proDivision: 'heavy', proWins: 1, proTotalBouts: 1 }),
  boxer('Lloyd McFloyd', { proDivision: 'heavy', proWins: 2, proTotalBouts: 2 }),
  boxer("O'Neil Bell", {
    nicknames: `"Supernova / Give 'em Hell"`,
    proDivision: 'cruiser',
    proWins: 27,
    proTotalBouts: 34
  }),
  boxer('Gabriel Munoz', {
    nicknames: '"Torito"',
    nationality: 'Mexico',
    proDivision: 'super feather',
    proWins: 20
  }),
  boxer('Jean-Pierre Dupont', { nationality: 'France', proWins: 3 }),
  boxer('Percy Underscore', { nicknames: '"100%_Pure"', proWins: 4 }),
  boxer('Wilson Godett', { nationality: 'Curaçao', proWins: 5 }),
  boxer('Mustafa Ali', { nationality: 'Côte D’Ivoire', proWins: 6 }),
  boxer('Brendan Fitzpatrick', {
    nicknames: '"Firecracker from Finglas"',
    nationality: 'Ireland',
    proDivision: 'middle',
    proWins: 7
  }),
  boxer('Aleksandrovichkonstantinopolskiyvladimirovichsonov', { proWins: 8 })
]

describe('searchBoxers', () => {
  let test: TestDatabase

  beforeAll(async () => {
    test = await createTestDatabase()
    await test.db.insert(divisions).values([
      { slug: 'heavy', name: 'Heavyweight', proDivision: 'heavy', sortOrder: 0 },
      { slug: 'cruiser', name: 'Cruiserweight', proDivision: 'cruiser', sortOrder: 1 },
      { slug: 'welter', name: 'Welterweight', proDivision: 'welter', sortOrder: 6 },
      {
        slug: 'super-feather',
        name: 'Super Featherweight',
        proDivision: 'super feather',
        sortOrder: 10
      },
      { slug: 'middle', name: 'Middleweight', proDivision: 'middle', sortOrder: 5 }
    ])
    await insertBoxers(test, rows)
  })

  afterAll(async () => {
    await test?.dispose()
  })

  const names = async (query: string, limit?: number) =>
    (await searchBoxers(test.db, query, { limit })).results.map(result => result.name)

  it('finds a full name first, then the name prefix, a word prefix and a substring', async () => {
    expect(await names('Floyd Mayweather Jr')).toEqual(['Floyd Mayweather Jr'])
    expect(await names('floyd')).toEqual([
      // Names starting with "floyd", in directory order (wins, then bouts, then name).
      'Floyd Patterson',
      'Floyd Mayweather Jr',
      'Floyd Mayweather Sr',
      // A later word starting with it, then the name merely containing it.
      'Pinklon Floyd Thomas',
      'Lloyd McFloyd'
    ])
  })

  it('finds partial names, nicknames, nationalities and divisions', async () => {
    expect(await names('ayweath')).toEqual(['Floyd Mayweather Jr', 'Floyd Mayweather Sr'])
    expect(await names('mayweather floyd')).toEqual(['Floyd Mayweather Jr', 'Floyd Mayweather Sr'])
    expect(await names('pretty boy')).toEqual(['Floyd Mayweather Jr'])
    expect(await names('"Money"')).toEqual(['Floyd Mayweather Jr'])
    expect(await names('supernova')).toEqual(["O'Neil Bell"])
    expect(await names('mexico')).toEqual(['Gabriel Munoz'])
    expect(await names('super feather')).toEqual(['Gabriel Munoz'])
  })

  it('ignores apostrophes, accents, case and punctuation', async () => {
    for (const query of ["o'neil", 'ONEIL', 'O’Neil Bell', 'oneil bell']) {
      expect(await names(query)).toEqual(["O'Neil Bell"])
    }
    expect(await names('Muñoz')).toEqual(['Gabriel Munoz'])
    expect(await names('jean pierre')).toEqual(['Jean-Pierre Dupont'])
    expect(await names('Jean-Pierre')).toEqual(['Jean-Pierre Dupont'])
  })

  it('folds accents on stored nationalities as on the query', async () => {
    for (const query of ['Curaçao', 'curacao', 'CURAÇAO']) {
      expect(await names(query)).toEqual(['Wilson Godett'])
    }
    for (const query of ['Côte', 'cote', 'Côte D’Ivoire', "cote d'ivoire"]) {
      expect(await names(query)).toEqual(['Mustafa Ali'])
    }
  })

  it('answers queries longer than D1 allows in a LIKE pattern (50 bytes)', async () => {
    // The limit this guards against, as D1 and Miniflare enforce it.
    await expect(
      test.binding
        .prepare("SELECT 'x' LIKE ?")
        .bind(`%${'a'.repeat(50)}%`)
        .first()
    ).rejects.toThrow(/LIKE or GLOB pattern too complex/)

    // Six terms, 54 bytes, for a boxer they all match.
    const long = 'brendan fitzpatrick firecracker finglas ireland middle'
    expect(await names(long)).toEqual(['Brendan Fitzpatrick'])
    expect(await names(`${long} zzz`)).toEqual(['Brendan Fitzpatrick'])
    expect(await names('fitzpatrick brendan zzz')).toEqual([])
    // One 50-byte term, and 25 two-byte letters (50 bytes).
    expect(await names('aleksandrovichkonstantinopolskiyvladimirovichsonov')).toEqual([
      'Aleksandrovichkonstantinopolskiyvladimirovichsonov'
    ])
    expect(await names('д'.repeat(25))).toEqual([])
  })

  it('treats LIKE wildcards as text, never as patterns', async () => {
    expect(await names('%')).toEqual([])
    expect(await names('_')).toEqual([])
    expect(await names('100%_pure')).toEqual(['Percy Underscore'])
  })

  it('returns nothing, without a query, for a query with no letters or digits', async () => {
    const sent = test.statements.length
    expect(await searchBoxers(test.db, ' -- ')).toEqual({
      query: '',
      results: [],
      truncated: false
    })
    expect(test.statements.length).toBe(sent)
  })

  it('returns at most the limit, says when there are more, and only the listed fields', async () => {
    const search = await searchBoxers(test.db, 'floyd', { limit: 2 })
    expect(search.query).toBe('floyd')
    expect(search.truncated).toBe(true)
    expect(search.results).toEqual([
      {
        slug: 'floyd-patterson',
        name: 'Floyd Patterson',
        nicknames: null,
        nationality: 'USA',
        proDivision: 'heavy',
        proWins: 55,
        proLosses: 0,
        proDraws: 0
      },
      expect.objectContaining({ slug: 'floyd-mayweather-jr', nicknames: '"Money,Pretty Boy"' })
    ])
    expect((await searchBoxers(test.db, 'floyd', { limit: 5 })).truncated).toBe(false)
    expect(SEARCH_RESULT_LIMIT).toBe(50)
  })

  it('ranks on the covering search index and reads the table only for the results', async () => {
    await searchBoxers(test.db, 'floyd may')
    const plan = await explainQueryPlan(test.binding, test.statements.at(-1)!)
    expect(plan.join('\n')).toMatch(/SCAN boxers USING COVERING INDEX boxers_search_idx/)
    expect(plan.join('\n')).toMatch(/SEARCH boxers USING INTEGER PRIMARY KEY \(rowid=\?\)/)
    expect(plan.join('\n')).not.toMatch(/SCAN boxers(?! USING COVERING INDEX)/)
  })
})

describe('the search keys', () => {
  let test: TestDatabase

  beforeAll(async () => {
    test = await createTestDatabase()
    await test.db.insert(divisions).values({
      slug: 'light-heavy',
      name: 'Light Heavyweight',
      proDivision: 'light heavy',
      sortOrder: 1
    })
  })

  afterAll(async () => {
    await test?.dispose()
  })

  it('are indexed exactly as searchBoxers writes them', async () => {
    const index = await test.binding
      .prepare("SELECT sql FROM sqlite_master WHERE name = 'boxers_search_idx'")
      .first<{ sql: string }>()
    expect(index?.sql).toContain(`(${SEARCH_TEXT_KEY},${SEARCH_NAME_KEY},`)
  })

  it("hold the same words as searchKeyWords for every fixture boxer's fields", async () => {
    const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Record<string, string | null>[]
    const latin1 = [...SQL_FOLDS.keys()].join('')
    const tricky = [
      boxer("Dave 'Boy' Green", { nicknames: `"'The Sensation'"` }),
      boxer('Miguel Sanchez  Avila', { nicknames: '"Joe / Panterita"' }),
      boxer('Angel L. Acosta Gomez', { nicknames: '"Jack Rau?"' }),
      boxer('Bill Brennan', { nicknames: '"Bill Shanks,KO Bill"', nationality: 'Côte D’Ivoire' }),
      boxer('Kid (Iron) Man, Jr.', { nicknames: '"Kid/Iron Man\\Joe; A|B & C+D: E"' }),
      boxer('Ray \u2018Sugar\u2019 Robinson', { nicknames: '\u201CSugar\u201D' }),
      boxer('Ricky `Hitman` Hatton', { proDivision: 'light heavy', nationality: 'Curaçao' }),
      boxer(`Every ${latin1} Fold`, { nicknames: latin1, nationality: latin1.toUpperCase() })
    ]
    const records = [
      ...fixture.map(record =>
        boxer(String(record.name), {
          nicknames: record.nicknames || null,
          nationality: record.nationality || null
        })
      ),
      ...tricky
    ]
    await insertBoxers(test, records)
    const { results } = await test.binding
      .prepare(
        `SELECT name, nicknames, nationality, pro_division, ${SEARCH_NAME_KEY} AS name_key, ` +
          `${SEARCH_TEXT_KEY} AS text_key FROM boxers`
      )
      .all<Record<string, string | null>>()
    expect(results).toHaveLength(records.length)
    for (const row of results) {
      const words = searchKeyWords(
        [row.name, row.nicknames, row.nationality, row.pro_division].filter(Boolean).join(' ')
      )
      // The name key is the name's words; the text key contains every word of every field.
      expect(row.name_key).toBe(searchKeyWords(row.name!).join(' '))
      expect(searchKeyWords(row.text_key!)).toEqual(words)
      for (const word of words) expect(row.text_key).toContain(word)
    }
  })
})
