/**
 * @jest-environment node
 */
import loadCustomRoutes from 'next/dist/lib/load-custom-routes'
import { modifyRouteRegex } from 'next/dist/lib/redirect-status'
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match'
import { prepareDestination } from 'next/dist/shared/lib/router/utils/prepare-destination'
import { canonicalPathname, slashRedirects } from './trailing-slash'

// Compile the rules the way the Next.js server does (server/lib/router-utils/filesystem.js):
// strict matching, case-insensitive, `/_next` restricted, and an optional trailing slash added
// to every source.
const compiled = slashRedirects.map(rule => {
  let regex = ''
  const match = getPathMatch(rule.source, {
    strict: true,
    removeUnnamedParams: true,
    regexModifier: source => {
      regex = modifyRouteRegex(source, ['/_next'])
      return regex
    }
  })
  return { ...rule, match, regex: new RegExp(regex, 'i') }
})

/** The Location Next.js answers for `pathname`, or null when no redirect matches. */
function nextRedirect(pathname: string): string | null {
  for (const rule of compiled) {
    const params = rule.match(pathname)
    if (params) {
      return prepareDestination({
        appendParamsToQuery: false,
        destination: rule.destination,
        params,
        query: {}
      }).newUrl
    }
  }
  return null
}

/** The index of the rule OpenNext picks: it tests each compiled regex, case-sensitively. */
function openNextRuleIndex(pathname: string): number {
  return compiled.findIndex(rule => new RegExp(rule.regex.source).test(pathname))
}

const api = ['/api', '/api/', '/api/search', '/api/search/', '/API', '/API/', '/Api/search']
const apiLike = ['/api/x.json/', '/api/auth/get-session', '/API/x.json/']

const expected: Array<[string, string | null]> = [
  // Pages gain a slash.
  ['/about', '/about/'],
  ['/boxers', '/boxers/'],
  ['/boxers/x', '/boxers/x/'],
  ['/boxers/len-wickwar', '/boxers/len-wickwar/'],
  ['/divisions/heavy/page/2', '/divisions/heavy/page/2/'],
  ['/docs/api', '/docs/api/'],
  ['/apis', '/apis/'],
  ['/About', '/About/'],
  // Files lose it.
  ['/robots.txt/', '/robots.txt'],
  ['/sitemap-index.xml/', '/sitemap-index.xml'],
  ['/sitemaps/pages/1.xml/', '/sitemaps/pages/1.xml'],
  ['/search/boxer-search-index.json/', '/search/boxer-search-index.json'],
  ['/api.json/', '/api.json'],
  // Canonical already.
  ['/', null],
  ['/about/', null],
  ['/boxers/x/', null],
  ['/robots.txt', null],
  ['/sitemaps/pages/1.xml', null],
  // Exempt.
  ['/_next/static/chunks/main.js', null],
  ['/_next/static/chunks/main.js/', null],
  ['/_next/data', null],
  ['/.well-known/security.txt', null],
  ['/.well-known/security.txt/', null],
  ['/.WELL-KNOWN/foo', null],
  ['/.well-known/', null],
  // Neither a page nor a file.
  ['/foo.', null],
  ['/boxers/x.y', null],
  ['/.env/', null]
]

describe('slashRedirects', () => {
  it('pass Next.js route validation', async () => {
    const routes = await loadCustomRoutes({
      redirects: async () => [...slashRedirects],
      trailingSlash: true,
      skipTrailingSlashRedirect: true,
      basePath: ''
    } as Parameters<typeof loadCustomRoutes>[0])

    // Next.js adds no trailing-slash redirect of its own: these four are the only ones.
    expect(routes.redirects.map(({ source, destination }) => ({ source, destination }))).toEqual(
      slashRedirects.map(({ source, destination }) => ({ source, destination }))
    )
  })

  it.each(api)('send %s to no same-host redirect', pathname => {
    expect(nextRedirect(pathname)).toBeNull()
    expect(openNextRuleIndex(pathname)).toBe(-1)
  })

  it.each(apiLike)('leave %s alone', pathname => {
    expect(nextRedirect(pathname)).toBeNull()
    expect(openNextRuleIndex(pathname)).toBe(-1)
  })

  it.each(expected)('redirect %s to %s', (pathname, location) => {
    expect(nextRedirect(pathname)).toBe(location)
    // OpenNext picks a rule for exactly the same paths.
    expect(openNextRuleIndex(pathname) >= 0).toBe(location !== null)
  })
})

describe('canonicalPathname', () => {
  it.each([...expected, ...api.map(path => [path, null]), ...apiLike.map(path => [path, null])])(
    'agrees with slashRedirects for %s',
    (pathname, location) => {
      expect(canonicalPathname(pathname as string)).toBe(location ?? pathname)
    }
  )

  it('agrees with slashRedirects on every combination of segment shapes', () => {
    const segments = ['a', 'api', 'API', '_n', '.well-known', 'x.txt', 'a.b', 'foo.', '.env']
    const paths: string[] = []
    for (const first of segments) {
      paths.push(`/${first}`, `/${first}/`)
      for (const second of segments) {
        paths.push(`/${first}/${second}`, `/${first}/${second}/`)
        for (const third of segments) {
          paths.push(`/${first}/${second}/${third}`, `/${first}/${second}/${third}/`)
        }
      }
    }

    for (const pathname of paths) {
      expect([pathname, canonicalPathname(pathname)]).toEqual([
        pathname,
        nextRedirect(pathname) ?? pathname
      ])
    }
  })
})
