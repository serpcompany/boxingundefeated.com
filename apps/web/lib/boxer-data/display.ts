/**
 * Text helpers for showing a boxer, the same on every page: the profile, the listings and the
 * search page. Client-safe: no server or D1 imports.
 */

/** Quote marks, straight or curly, by family: a double-quoted nickname, a single-quoted one. */
const QUOTE_FAMILIES = [/["“”„]/, /['‘’]/] as const

/**
 * The nickname without the quotes the source wraps it in, or null when nothing is left. Every
 * nickname in the data comes quoted, `"The Hammer"`, some of them twice (`"'The Hammer'"`), one
 * with escaped quotes (`"\"Reinito\""`). The outer marks go while both ends are marks of the same
 * family, straight or curly, unless a mark of that family inside sits next to a space: then they
 * quote parts of the text, as in `'The Apache' or 'Anto'`, and stay. Apostrophes inside a word
 * (`Rok'n'Rolla`, `Hot 'N Spicy`) always stay.
 */
export function stripNicknameQuotes(nicknames: string | null | undefined): string | null {
  let text = (nicknames ?? '').replace(/\\(["'])/g, '$1').trim()
  for (;;) {
    const family = QUOTE_FAMILIES.find(
      mark => text.length >= 2 && mark.test(text[0] ?? '') && mark.test(text.at(-1) ?? '')
    )
    if (!family) break
    const inner = text.slice(1, -1)
    const quotesParts = new RegExp(`\\s${family.source}|${family.source}\\s`).test(inner)
    if (quotesParts) break
    text = inner.trim()
  }
  return /^["“”„'‘’\s]*$/.test(text) ? null : text
}

/**
 * The nickname as every page shows it, in one pair of straight double quotes, or null. Text that
 * still starts and ends with double quotes quotes its parts (`"Money" "Pretty Boy"`), and shows
 * as it is.
 */
export function formatNickname(nicknames: string | null | undefined): string | null {
  const text = stripNicknameQuotes(nicknames)
  if (text === null) return null
  return /^["“”„][\s\S]*["“”„]$/.test(text) ? text : `"${text}"`
}

/** The noun that agrees with `count`: `plural(1, 'fight')` is `fight`, otherwise `fights`. */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return count === 1 ? singular : pluralForm
}
