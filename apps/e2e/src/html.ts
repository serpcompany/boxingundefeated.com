/**
 * The SEO facts of an HTML page that the smoke suite and the parity check compare, read with
 * regular expressions: the pages are our own Next.js output, so a parser would add a dependency
 * without adding certainty.
 */

export interface PageFacts {
  /** The document title. Icons' SVG `<title>`s are not it. */
  title: string | null
  canonical: string | null
  /** How many `<link rel="canonical">` the page has; exactly one is right. */
  canonicalCount: number
  ogUrl: string | null
  /** The text of the first `<h1>`, tags removed and whitespace collapsed. */
  h1: string | null
  /** `<meta name="robots">` content, or null when the page has none. */
  robots: string | null
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' '
}

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
    if (name[0] === '#') {
      const code =
        name[1] === 'x' || name[1] === 'X'
          ? Number.parseInt(name.slice(2), 16)
          : Number.parseInt(name.slice(1), 10)
      return Number.isNaN(code) ? entity : String.fromCodePoint(code)
    }
    return ENTITIES[name.toLowerCase()] ?? entity
  })
}

function text(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim()
}

function attribute(tag: string, name: string): string | null {
  const match = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(tag)
  return match ? decodeEntities(match[1] ?? match[2] ?? '') : null
}

function tags(html: string, name: string): string[] {
  return html.match(new RegExp(`<${name}\\b[^>]*>`, 'gi')) ?? []
}

export function pageFacts(html: string): PageFacts {
  // Inline SVG icons carry their own <title>, and React may stream metadata after </head>, so
  // drop the SVGs and search the whole document.
  const document = html.replace(/<svg\b[\s\S]*?<\/svg>/gi, '')
  const title = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(document)
  const canonicals = tags(document, 'link').filter(tag =>
    /^canonical$/i.test(attribute(tag, 'rel') ?? '')
  )
  const ogUrl = tags(document, 'meta').find(tag => attribute(tag, 'property') === 'og:url')
  const robots = tags(document, 'meta').find(tag => /^robots$/i.test(attribute(tag, 'name') ?? ''))
  const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(document)

  return {
    title: title ? text(title[1]) : null,
    canonical: canonicals[0] ? attribute(canonicals[0], 'href') : null,
    canonicalCount: canonicals.length,
    ogUrl: ogUrl ? attribute(ogUrl, 'content') : null,
    h1: h1 ? text(h1[1]) : null,
    robots: robots ? attribute(robots, 'content') : null
  }
}

/** Whether a robots directive (`<meta name="robots">` or `X-Robots-Tag`) forbids indexing. */
export function isNoindex(directive: string | null | undefined): boolean {
  return /(?:^|[\s,])(?:noindex|none)(?:$|[\s,])/i.test(directive ?? '')
}
