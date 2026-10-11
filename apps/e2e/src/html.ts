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
  /** `<meta property="og:title">` content: a share's title, the document title (#87). */
  ogTitle: string | null
  /** `<meta name="twitter:title">` content, the document title as well. */
  twitterTitle: string | null
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

/** Visible text for comparison, not sanitized HTML: tags are removed until none is left. */
function text(html: string): string {
  let stripped = html
  for (let previous = ''; previous !== stripped; ) {
    previous = stripped
    stripped = stripped.replace(/<[^<>]*>/g, '')
  }
  return decodeEntities(stripped).replace(/\s+/g, ' ').trim()
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
  const meta = (key: string, value: string) =>
    tags(document, 'meta').find(tag => attribute(tag, key) === value)
  const content = (tag: string | undefined) => (tag ? attribute(tag, 'content') : null)
  const robots = tags(document, 'meta').find(tag => /^robots$/i.test(attribute(tag, 'name') ?? ''))
  const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(document)

  return {
    title: title ? text(title[1]) : null,
    canonical: canonicals[0] ? attribute(canonicals[0], 'href') : null,
    canonicalCount: canonicals.length,
    ogUrl: content(meta('property', 'og:url')),
    ogTitle: content(meta('property', 'og:title')),
    twitterTitle: content(meta('name', 'twitter:title')),
    h1: h1 ? text(h1[1]) : null,
    robots: robots ? attribute(robots, 'content') : null
  }
}

/** Whether a robots directive (`<meta name="robots">` or `X-Robots-Tag`) forbids indexing. */
export function isNoindex(directive: string | null | undefined): boolean {
  return /(?:^|[\s,])(?:noindex|none)(?:$|[\s,])/i.test(directive ?? '')
}

/**
 * robots.txt's groups: each user agent (lower case) and its `allow`/`disallow` rules, as
 * `allow: /` (lower-case field, value as written). Agents listed together share their rules.
 */
export function robotsGroups(text: string): Map<string, string[]> {
  const groups = new Map<string, string[]>()
  let agents: string[] = []
  let rules: string[] = []
  let inRules = false
  const close = () => {
    for (const agent of agents) groups.set(agent, rules)
  }
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*/, '').trim()
    const separator = line.indexOf(':')
    if (separator === -1) continue
    const field = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()
    if (field === 'user-agent') {
      if (inRules) {
        close()
        agents = []
        rules = []
        inRules = false
      }
      agents.push(value.toLowerCase())
    } else if (field === 'allow' || field === 'disallow') {
      inRules = true
      rules.push(`${field}: ${value}`)
    }
  }
  close()
  return groups
}
