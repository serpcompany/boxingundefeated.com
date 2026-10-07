import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DIVISIONS, prepareDataset } from '../import'
import { REFERENCE_DIVISIONS, referenceOpponentSlugs } from './reference'

const FIXTURE = resolve(import.meta.dirname, '../../../../d1/fixtures/boxers.sample.json')

const record = (slug: string, name: string, proTotalBouts: number, birthName?: string) => ({
  slug,
  name,
  birthName: birthName ?? null,
  proTotalBouts,
  proWins: 0
})

describe('the parity reference (the static site, independent of the importer)', () => {
  it('never imports the importer mapping', () => {
    const source = readFileSync(new URL('./reference.ts', import.meta.url), 'utf8')
    expect(source).not.toMatch(/from '\.\.\/import/)
  })

  it('has the 17 divisions in display order, as the importer writes them', () => {
    expect(REFERENCE_DIVISIONS.map(({ slug, name, division }) => [slug, name, division])).toEqual(
      DIVISIONS.map(({ slug, name, proDivision }) => [slug, name, proDivision])
    )
  })

  it('matches exact names, normalized names, suffixes and birth names', () => {
    const lookup = referenceOpponentSlugs([
      record('floyd-jr', 'Floyd Mayweather Jr', 50),
      record('cassius', 'Muhammad Ali', 60, 'Cassius Clay')
    ])
    expect(lookup('Floyd Mayweather Jr')).toBe('floyd-jr')
    expect(lookup('  floyd   MAYWEATHER ')).toBe('floyd-jr')
    expect(lookup('Cassius Clay')).toBe('cassius')
    expect(lookup('Nobody')).toBeUndefined()
  })

  it('lets the boxer with fewer bouts win a contested name, whatever the source order', () => {
    const records = [
      record('floyd-sr', 'Floyd Mayweather Sr', 35),
      record('floyd-jr', 'Floyd Mayweather Jr', 50)
    ]
    expect(referenceOpponentSlugs(records)('Floyd Mayweather')).toBe('floyd-sr')
    expect(referenceOpponentSlugs([...records].reverse())('Floyd Mayweather')).toBe('floyd-sr')
  })

  it('links every fixture bout to the same profile as the importer', () => {
    const source = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Record<string, unknown>[]
    const dataset = prepareDataset(structuredClone(source))
    const lookup = referenceOpponentSlugs(source)
    const slugById = new Map(dataset.boxers.map(boxer => [boxer.id, boxer.slug as string]))
    const kept = new Set(slugById.values())

    let linked = 0
    for (const bout of dataset.bouts) {
      const name = bout.opponent_name as string
      const expected = lookup(name)
      const id = bout.opponent_boxer_id
      const actual = id === null ? undefined : slugById.get(id)
      expect([name, actual]).toEqual([name, expected && kept.has(expected) ? expected : undefined])
      if (actual) linked++
    }
    expect(linked).toBeGreaterThan(0)
  })
})
