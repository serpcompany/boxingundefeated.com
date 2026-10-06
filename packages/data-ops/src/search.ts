/**
 * Boxer search keys: one normalization, applied by SQLite to the stored fields (`SEARCH_TEXT_KEY`
 * and `SEARCH_NAME_KEY`, indexed by `boxers_search_idx`) and by the app to what a visitor types
 * (`searchTerms`). A boxer matches when every term is a substring of its text key, so keys and
 * terms must agree on letters. `search.test.ts` checks that they do.
 *
 * Accented letters fold to their base letters on both sides, so "Curaçao", "curacao", "Muñoz"
 * and "Munoz" find the same boxers. SQLite has no Unicode folding, so the keys spell out one
 * `replace()` per letter, and D1 caps an expression's depth at 100: the stored keys fold the
 * Latin-1 letters (`SQL_FOLDS`), which covers every name, nickname, nationality and division in
 * the pipeline data (its only non-ASCII letters are "ç" and "ô"). Queries fold every Latin letter.
 */

/** Removed outright, so "O'Neil" is found by both "oneil" and "o'neil". */
const APOSTROPHES = ["'", '‘', '’'] as const
/**
 * Word separators in names ("Jean-Pierre", "Angel L. Acosta"), for the name key's word-prefix
 * ranking. The text key needs none: terms are letters and digits, matched as substrings.
 */
const NAME_SEPARATORS = ['-', '.', ',', '/', '(', ')', '"', '`'] as const
/** Latin letters with no canonical decomposition, folded by hand. */
const LETTER_FOLDS: Readonly<Record<string, string>> = {
  ß: 'ss',
  Æ: 'ae',
  æ: 'ae',
  Œ: 'oe',
  œ: 'oe',
  Ø: 'o',
  ø: 'o',
  Ð: 'd',
  ð: 'd',
  Đ: 'd',
  đ: 'd',
  Ħ: 'h',
  ħ: 'h',
  ı: 'i',
  Ł: 'l',
  ł: 'l',
  Þ: 'th',
  þ: 'th',
  Ŧ: 't',
  ŧ: 't'
}

/** The longest `q` accepted, in UTF-16 code units. Every name and nickname is under 40. */
export const SEARCH_QUERY_MAX_LENGTH = 100
/** Terms beyond this many are ignored: each one is another substring test over the index. */
export const SEARCH_MAX_TERMS = 6
/** The most boxers one search returns. Today's static search shows 50. */
export const SEARCH_RESULT_LIMIT = 50

const COMBINING_MARKS = /\p{M}+/gu

/** A letter's lowercase fold: its canonical decomposition without the accents, or `LETTER_FOLDS`. */
function foldOf(letter: string): string | undefined {
  const base = letter.normalize('NFD').replace(COMBINING_MARKS, '')
  const fold = base !== letter && /^[A-Za-z]+$/u.test(base) ? base : LETTER_FOLDS[letter]
  return fold?.toLowerCase()
}

/** The Latin-1 letters (U+00C0 to U+00FF) the stored keys fold, with their folds. */
export const SQL_FOLDS: ReadonlyMap<string, string> = (() => {
  const folds = new Map<string, string>()
  for (let code = 0xc0; code <= 0xff; code++) {
    const letter = String.fromCodePoint(code)
    const fold = foldOf(letter)
    if (fold) folds.set(letter, fold)
  }
  return folds
})()

function sqlCharacter(character: string): string {
  const code = character.codePointAt(0)!
  // Keep the migration ASCII: non-ASCII characters are written as `char(<code point>)`.
  return code > 0x7e ? `char(${code})` : `'${character.replaceAll("'", "''")}'`
}

/** `expression` with `SQL_FOLDS` applied and apostrophes removed. */
function foldedSql(expression: string): string {
  let key = expression
  for (const [letter, fold] of SQL_FOLDS)
    key = `replace(${key}, ${sqlCharacter(letter)}, '${fold}')`
  for (const apostrophe of APOSTROPHES) key = `replace(${key}, ${sqlCharacter(apostrophe)}, '')`
  return key
}

/**
 * The key `searchBoxers` matches on: name, nicknames, nationality and division, folded and
 * lowercased. Queries must repeat this exact expression for SQLite to read it from
 * `boxers_search_idx` instead of computing it per row. It may only reference columns of `boxers`,
 * unqualified, because an index stores it.
 */
export const SEARCH_TEXT_KEY = `lower(${foldedSql(
  "name || ' ' || coalesce(nicknames, '') || ' ' || coalesce(nationality, '') || ' ' || coalesce(pro_division, '')"
)})`

/**
 * The key `searchBoxers` ranks on: the name, folded, `NAME_SEPARATORS` turned into spaces, runs
 * of spaces collapsed, trimmed and lowercased, so it reads as the name's words joined by spaces.
 */
export const SEARCH_NAME_KEY = (() => {
  let key = foldedSql('name')
  for (const separator of NAME_SEPARATORS) key = `replace(${key}, ${sqlCharacter(separator)}, ' ')`
  // Each pass halves a run of spaces; three passes collapse runs of up to eight.
  for (let pass = 0; pass < 3; pass++) key = `replace(${key}, '  ', ' ')`
  return `lower(trim(${key}))`
})()

const APOSTROPHE_PATTERN = new RegExp(`[${APOSTROPHES.join('')}]`, 'gu')
/** What survives as a term: letters and digits, so no SQL syntax or wildcard ever does. */
const TERM = /[\p{L}\p{N}]+/gu

/**
 * The words of `text` as they appear in its search keys: accents folded (`LETTER_FOLDS`, then
 * any canonical accents stripped), lowercased, apostrophes dropped, split on everything that
 * isn't a letter or a digit.
 */
export function searchKeyWords(text: string): string[] {
  const folded = [...text.normalize('NFC')]
    .map(character => LETTER_FOLDS[character] ?? character)
    .join('')
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(APOSTROPHE_PATTERN, '')
  return folded.match(TERM) ?? []
}

/**
 * What a visitor's query searches for: its words (`searchKeyWords`) without duplicates, at most
 * `SEARCH_MAX_TERMS`, in order. An empty list means there is nothing to search for.
 */
export function searchTerms(query: string): string[] {
  return [...new Set(searchKeyWords(query))].slice(0, SEARCH_MAX_TERMS)
}
