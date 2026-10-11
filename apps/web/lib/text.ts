/**
 * Plain text from HTML we trust, such as a boxer's bio, for places that take text only: meta
 * descriptions (lib/metadata.ts). It is not a sanitizer; React escapes the result wherever it goes.
 */

/** Elements that start a new line of text where they open and where they close. */
const BLOCK_TAGS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'br',
  'caption',
  'dd',
  'details',
  'div',
  'dl',
  'dt',
  'figcaption',
  'figure',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'summary',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul'
])

/** Elements whose content is never shown as text. */
const HIDDEN_CONTENT_TAGS = new Set(['script', 'style', 'template'])

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
  ensp: '\u2002',
  emsp: '\u2003',
  thinsp: '\u2009',
  ndash: '\u2013',
  mdash: '\u2014',
  lsquo: '\u2018',
  rsquo: '\u2019',
  sbquo: '\u201a',
  ldquo: '\u201c',
  rdquo: '\u201d',
  bdquo: '\u201e',
  laquo: '\u00ab',
  raquo: '\u00bb',
  hellip: '\u2026',
  bull: '\u2022',
  middot: '\u00b7',
  deg: '\u00b0',
  frac12: '\u00bd',
  frac14: '\u00bc',
  frac34: '\u00be',
  times: '\u00d7',
  copy: '\u00a9',
  reg: '\u00ae',
  trade: '\u2122',
  euro: '\u20ac',
  pound: '\u00a3',
  cent: '\u00a2',
  yen: '\u00a5',
  iexcl: '\u00a1',
  iquest: '\u00bf',
  szlig: '\u00df',
  aelig: '\u00e6',
  AElig: '\u00c6',
  oslash: '\u00f8',
  Oslash: '\u00d8',
  eth: '\u00f0',
  ETH: '\u00d0',
  thorn: '\u00fe',
  THORN: '\u00de'
}

/** The accents of entities such as `&eacute;`, `&ntilde;` and `&scaron;`, as combining marks. */
const ACCENTS: Record<string, string> = {
  acute: '\u0301',
  grave: '\u0300',
  circ: '\u0302',
  tilde: '\u0303',
  uml: '\u0308',
  ring: '\u030a',
  cedil: '\u0327',
  caron: '\u030c'
}

const ENTITY = /&(?:#(\d+);?|#[xX]([0-9a-fA-F]+);?|([A-Za-z][A-Za-z0-9]*);)/g
const ACCENTED_LETTER = /^([A-Za-z])(acute|grave|circ|tilde|uml|ring|cedil|caron)$/

function decodeCodePoint(codePoint: number): string {
  const valid =
    codePoint > 0 && codePoint <= 0x10ffff && !(codePoint >= 0xd800 && codePoint <= 0xdfff)

  return valid ? String.fromCodePoint(codePoint) : '\ufffd'
}

function decodeNamedEntity(name: string): string | undefined {
  if (Object.hasOwn(NAMED_ENTITIES, name)) {
    return NAMED_ENTITIES[name]
  }

  const accented = ACCENTED_LETTER.exec(name)
  if (!accented) {
    return undefined
  }

  // One precomposed letter (é, ñ, š) or none: `&qacute;` is no entity.
  const letter = `${accented[1]}${ACCENTS[accented[2]]}`.normalize('NFC')
  return [...letter].length === 1 ? letter : undefined
}

/**
 * Decodes character references: numeric ones (`&#39;`, `&#x27;`) and the named ones bios and
 * names use (`&amp;`, `&nbsp;`, `&rsquo;`, `&eacute;`). An unknown name, or an `&` that starts no
 * reference (`Q&A`), stays as written.
 */
export function decodeHtmlEntities(text: string): string {
  return text.replace(ENTITY, (reference, decimal?: string, hex?: string, name?: string) => {
    if (decimal !== undefined) return decodeCodePoint(Number.parseInt(decimal, 10))
    if (hex !== undefined) return decodeCodePoint(Number.parseInt(hex, 16))
    return (name !== undefined && decodeNamedEntity(name)) || reference
  })
}

type Markup =
  | { kind: 'tag'; name: string; closing: boolean; end: number }
  | { kind: 'comment'; end: number }

function isAsciiLetter(character: string | undefined): boolean {
  return character !== undefined && /^[A-Za-z]$/.test(character)
}

/** The end of the tag whose name ends at `from`: past its `>`, skipping quoted attribute values. */
function findTagEnd(html: string, from: number): number {
  let index = from
  let afterEquals = false

  while (index < html.length) {
    const character = html[index]

    if (character === '>') {
      return index + 1
    }

    if (afterEquals && (character === '"' || character === "'")) {
      const closingQuote = html.indexOf(character, index + 1)
      if (closingQuote === -1) {
        return html.length
      }
      index = closingQuote + 1
      afterEquals = false
      continue
    }

    if (character === '=') {
      afterEquals = true
    } else if (!/\s/.test(character)) {
      afterEquals = false
    }
    index++
  }

  // A tag cut off by the end of the input is dropped, as a browser drops it.
  return html.length
}

/** The tag or comment at `start` (a `<`), or `undefined` when that `<` is text, as in `3 < 5`. */
function readMarkup(html: string, start: number): Markup | undefined {
  if (html.startsWith('<!--', start)) {
    const close = html.indexOf('-->', start + 4)
    return { kind: 'comment', end: close === -1 ? html.length : close + 3 }
  }

  const next = html[start + 1]

  // `<!DOCTYPE>`, `<![CDATA[`, `<?xml ?>`: bogus comments to a browser.
  if (next === '!' || next === '?') {
    const close = html.indexOf('>', start + 2)
    return { kind: 'comment', end: close === -1 ? html.length : close + 1 }
  }

  const closing = next === '/'
  const nameStart = start + (closing ? 2 : 1)
  if (!isAsciiLetter(html[nameStart])) {
    return undefined
  }

  let nameEnd = nameStart
  while (nameEnd < html.length && /[^\s/>]/.test(html[nameEnd])) {
    nameEnd++
  }

  return {
    kind: 'tag',
    name: html.slice(nameStart, nameEnd).toLowerCase(),
    closing,
    end: findTagEnd(html, nameEnd)
  }
}

/** Where the content of a `<script>`, `<style>` or `<template>` ends: at its closing tag. */
function findHiddenContentEnd(html: string, from: number, name: string): number {
  const close = html.toLowerCase().indexOf(`</${name}`, from)
  return close === -1 ? html.length : close
}

/**
 * The text a reader sees in an HTML fragment, one line per block: tags and comments go, block
 * elements (`<p>`, `<br>`, headings, list items) start a new line, inline ones (`<strong>`,
 * `<a>`) join their text to the words around them, and character references are decoded. Each
 * line has its whitespace collapsed and trimmed; empty lines go. Returns `''` for markup alone.
 */
export function htmlToPlainText(html: string): string {
  const lines: string[] = []
  let line = ''
  let index = 0

  while (index < html.length) {
    const open = html.indexOf('<', index)
    if (open === -1) {
      line += html.slice(index)
      break
    }

    line += html.slice(index, open)
    const markup = readMarkup(html, open)

    if (!markup) {
      line += '<'
      index = open + 1
      continue
    }

    index = markup.end

    if (markup.kind === 'tag') {
      if (BLOCK_TAGS.has(markup.name)) {
        lines.push(line)
        line = ''
      } else if (!markup.closing && HIDDEN_CONTENT_TAGS.has(markup.name)) {
        index = findHiddenContentEnd(html, index, markup.name)
      }
    }
  }

  lines.push(line)

  return lines
    .map(text => decodeHtmlEntities(text).replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}
