/**
 * Boxer search keys: one normalization, applied by SQLite to the stored fields (`searchKeySql`,
 * indexed by `boxers_search_idx`) and by the app to what a visitor types (`searchTerms`). A boxer
 * matches when every term is a substring of its key, so keys and terms must agree on the
 * characters below. `search.test.ts` checks that they do.
 *
 * The pipeline's names, nicknames, nationalities and divisions are all ASCII, so SQLite's
 * ASCII-only `lower()` folds them fully. Visitors may type accents ("Muñoz"), which `searchTerms`
 * strips, so they find the ASCII name ("Munoz").
 */

/** Removed outright, so "O'Neil" is found by both "oneil" and "o'neil". */
const REMOVED = ["'", '"', '`', '?', '‘', '’', '“', '”'] as const
/** Word separators: "Jean-Pierre", "Money,Pretty Boy", "Joe / Panterita", "(Kid)". */
const SEPARATORS = [',', '-', '.', '/', '\\', '(', ')', ':', ';', '|', '&', '+'] as const

/** The longest `q` accepted, in UTF-16 code units. Every name and nickname is under 40. */
export const SEARCH_QUERY_MAX_LENGTH = 100
/** Terms beyond this many are ignored: each one is another `LIKE` over the search index. */
export const SEARCH_MAX_TERMS = 6
/** The most boxers one search returns. Today's static search shows 50. */
export const SEARCH_RESULT_LIMIT = 50

function sqlCharacter(character: string): string {
  const code = character.codePointAt(0)!
  // Keep the migration ASCII: non-ASCII characters are written as `char(<code point>)`.
  return code > 0x7e ? `char(${code})` : `'${character.replaceAll("'", "''")}'`
}

/**
 * The SQL expression for the search key of `expression`: `REMOVED` dropped, `SEPARATORS` turned
 * into spaces, runs of spaces collapsed, lowercased. It may only reference columns of `boxers`,
 * unqualified, because an index stores it.
 */
export function searchKeySql(expression: string): string {
  let key = expression
  for (const character of REMOVED) key = `replace(${key}, ${sqlCharacter(character)}, '')`
  for (const character of SEPARATORS) key = `replace(${key}, ${sqlCharacter(character)}, ' ')`
  // Each pass halves a run of spaces; three passes collapse runs of up to eight.
  for (let pass = 0; pass < 3; pass++) key = `replace(${key}, '  ', ' ')`
  return `lower(trim(${key}))`
}

/**
 * The key `searchBoxers` ranks on: the name. Queries must repeat this exact expression for SQLite
 * to read it from `boxers_search_idx` instead of computing it per row.
 */
export const SEARCH_NAME_KEY = searchKeySql('name')

/** The key `searchBoxers` matches on: the name, nicknames, nationality and division. */
export const SEARCH_TEXT_KEY = searchKeySql(
  "name || ' ' || coalesce(nicknames, '') || ' ' || coalesce(nationality, '') || ' ' || coalesce(pro_division, '')"
)

const REMOVED_PATTERN = new RegExp(`[${REMOVED.join('')}]`, 'gu')
const COMBINING_MARKS = /\p{M}+/gu
/** What survives as a term: letters and digits. LIKE wildcards (`%`, `_`) never do. */
const TERM = /[\p{L}\p{N}]+/gu

/**
 * The words of `text` as they appear in its search key: accents stripped, lowercased, `REMOVED`
 * characters dropped, split on everything that isn't a letter or a digit.
 */
export function searchKeyWords(text: string): string[] {
  const folded = text
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(REMOVED_PATTERN, '')
  return folded.match(TERM) ?? []
}

/**
 * What a visitor's query searches for: its words (`searchKeyWords`) without duplicates, at most
 * `SEARCH_MAX_TERMS`, in order. An empty list means there is nothing to search for.
 */
export function searchTerms(query: string): string[] {
  return [...new Set(searchKeyWords(query))].slice(0, SEARCH_MAX_TERMS)
}

/** Escapes `LIKE` wildcards for a pattern used with `ESCAPE '\'`. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/gu, character => `\\${character}`)
}
