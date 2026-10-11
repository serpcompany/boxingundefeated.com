import { describe, expect, it } from 'vitest'
import { formatNickname, plural, stripNicknameQuotes } from './display'

describe('stripNicknameQuotes', () => {
  it.each([
    // Every nickname in the data comes in straight double quotes (#98).
    ['"Boogieman"', 'Boogieman'],
    ['"Money,Pretty Boy"', 'Money,Pretty Boy'],
    // 210 of them are quoted twice, double then single.
    ['"\'The Sensation\'"', 'The Sensation'],
    ["\"'Rok'n'Rolla'\"", "Rok'n'Rolla"],
    // One has escaped quotes inside its quotes.
    ['"\\"Reinito\\""', 'Reinito'],
    // Curly quotes, double and single, and space inside the marks.
    ['“The Hammer”', 'The Hammer'],
    ['‘The Hammer’', 'The Hammer'],
    ['“‘The Hammer’”', 'The Hammer'],
    ['" The Hammer "', 'The Hammer'],
    // Unquoted.
    ['The Hammer', 'The Hammer']
  ])('%s is %s', (stored, text) => {
    expect(stripNicknameQuotes(stored)).toBe(text)
  })

  it.each([
    // Apostrophes are part of the name, at either end or inside it.
    ['"Smokin\'"', "Smokin'"],
    ['"Hot \'N Spicy"', "Hot 'N Spicy"],
    ['"Will o\' the Wisp"', "Will o' the Wisp"],
    // Marks that quote parts of the text, not all of it, stay.
    ["\"'The Apache' or 'Anto'\"", "'The Apache' or 'Anto'"],
    ["\"'Drago' 'Hopey'\"", "'Drago' 'Hopey'"],
    ['"Money" "Pretty Boy"', '"Money" "Pretty Boy"']
  ])('keeps the marks that are part of %s', (stored, text) => {
    expect(stripNicknameQuotes(stored)).toBe(text)
  })

  it.each([null, undefined, '', '   ', '""', '"\'\'"', '“”'])('is null for %j', stored => {
    expect(stripNicknameQuotes(stored)).toBeNull()
  })
})

describe('formatNickname', () => {
  it('shows the nickname in one pair of straight double quotes, however the source quotes it', () => {
    for (const stored of ['"Boogieman"', '"\'Boogieman\'"', '“Boogieman”', 'Boogieman']) {
      expect(formatNickname(stored)).toBe('"Boogieman"')
    }
  })

  it('adds no quotes around text that quotes its parts', () => {
    expect(formatNickname("\"'The Apache' or 'Anto'\"")).toBe("\"'The Apache' or 'Anto'\"")
    expect(formatNickname('"Money" "Pretty Boy"')).toBe('"Money" "Pretty Boy"')
  })

  it('is null when there is no nickname to show', () => {
    expect(formatNickname(null)).toBeNull()
    expect(formatNickname('""')).toBeNull()
  })
})

describe('plural', () => {
  it('is the singular for exactly one, and the plural otherwise', () => {
    expect(plural(1, 'fight')).toBe('fight')
    expect(plural(0, 'fight')).toBe('fights')
    expect(plural(2, 'fight')).toBe('fights')
    expect(plural(1, 'victory', 'victories')).toBe('victory')
    expect(plural(5, 'victory', 'victories')).toBe('victories')
  })
})
