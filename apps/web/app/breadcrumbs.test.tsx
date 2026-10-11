import type {
  Boxer,
  BoxerListItem,
  BoxerPage,
  BoxerProfile,
  DivisionBoxerPage,
  DivisionWithCount
} from '@boxingundefeated/data-ops'
import { render } from '@testing-library/react'
import type { Metadata } from 'next'
import type { ReactElement } from 'react'
import { toAbsoluteUrl } from '@/lib/url-utils'

// The boxer and division pages read D1 through data-ops in the Worker; these stand in for its
// queries. Shop articles and listings read the real markdown in content/.
const mockGetCloudflareContext = jest.fn()
const mockGetBoxerProfile = jest.fn<Promise<BoxerProfile | null>, [unknown, string]>()
const mockListBoxers = jest.fn<Promise<BoxerPage | null>, [unknown, { page?: number }]>()
const mockListBoxersByDivision = jest.fn<
  Promise<DivisionBoxerPage | null>,
  [unknown, string, { page?: number }]
>()
const mockListDivisions = jest.fn<Promise<DivisionWithCount[]>, [unknown]>()

jest.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_HTTP_ERROR_FALLBACK;404')
  }
}))
// `next/server` needs the fetch globals jsdom lacks.
jest.mock('next/server', () => ({ connection: jest.fn(async () => undefined) }))
jest.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: (...args: unknown[]) => mockGetCloudflareContext(...args)
}))
jest.mock('@boxingundefeated/data-ops', () => ({
  ...jest.requireActual('@boxingundefeated/data-ops'),
  getBoxerProfile: (db: unknown, slug: string) => mockGetBoxerProfile(db, slug),
  listBoxers: (db: unknown, options: { page?: number }) => mockListBoxers(db, options),
  listBoxersByDivision: (db: unknown, slug: string, options: { page?: number }) =>
    mockListBoxersByDivision(db, slug, options),
  listDivisions: (db: unknown) => mockListDivisions(db)
}))
// The article body is beside the point here, and remark is ESM only.
jest.mock('remark', () => ({
  remark: () => ({ use: () => ({ process: async (markdown: string) => markdown }) })
}))
jest.mock('remark-html', () => ({ __esModule: true, default: () => undefined }))

import PrivacyPolicyPage, { metadata as privacyMetadata } from './(legal)/privacy/page'
import TermsOfServicePage, { metadata as termsMetadata } from './(legal)/terms/page'
import ShopArticlePage, { generateMetadata as shopArticleMetadata } from './[...slug]/page'
import BoxerProfilePage, { generateMetadata as boxerMetadata } from './boxers/[slug]/page'
import BoxersPage, { generateMetadata as boxersMetadata } from './boxers/page'
import BoxersPaginatedPage, {
  generateMetadata as boxersPageMetadata
} from './boxers/page/[page]/page'
import DivisionPage, { generateMetadata as divisionMetadata } from './divisions/[division]/page'
import DivisionPaginatedPage, {
  generateMetadata as divisionPageMetadata
} from './divisions/[division]/page/[page]/page'
import DivisionsPage, { generateMetadata as divisionsMetadata } from './divisions/page'
import ShopPage, { generateMetadata as shopMetadata } from './shop/page'
import ShopPaginatedPage, { generateMetadata as shopPageMetadata } from './shop/page/[page]/page'

const ORIGIN = 'http://localhost:8787'

const heavy = { slug: 'heavy', name: 'Heavyweight', proDivision: 'heavy', sortOrder: 0 }

function listed(slug: string): BoxerListItem {
  return {
    id: 1,
    slug,
    name: 'Ana Alpha',
    nicknames: null,
    avatarImage: null,
    nationality: null,
    proDivision: 'heavy',
    proStatus: null,
    proWins: 1,
    proWinsByKnockout: 0,
    proLosses: 0,
    proDraws: 0,
    proTotalBouts: 1
  }
}

function boxer(): Boxer {
  return {
    ...listed('ana-alpha'),
    boxrecId: '1',
    boxrecUrl: 'https://boxrec.com/en/box-pro/1',
    birthName: null,
    residence: null,
    birthPlace: null,
    dateOfBirth: null,
    gender: null,
    height: null,
    reach: null,
    stance: null,
    bio: null,
    promoters: [],
    trainers: [],
    managers: [],
    gym: null,
    proDebutDate: null,
    proLossesByKnockout: 0,
    proTotalRounds: null,
    createdAt: null,
    updatedAt: null,
    importedAt: '2026-10-06 00:00:00'
  }
}

const listing = { items: [listed('ana-alpha')], pageSize: 48, totalItems: 120, totalPages: 3 }

interface Crumb {
  name: string
  /** The link, or null for the current page. */
  href: string | null
}

interface ListItem {
  '@type': string
  position: number
  name: string
  item: string
}

function visibleCrumbs(container: HTMLElement): Crumb[] {
  const nav = container.querySelectorAll('nav[aria-label="breadcrumb"]')
  expect(nav).toHaveLength(1)
  return [...nav[0]!.querySelectorAll('[data-slot="breadcrumb-item"]')].map(item => ({
    name: item.textContent ?? '',
    href: item.querySelector('a')?.getAttribute('href') ?? null
  }))
}

function breadcrumbJsonLd(container: HTMLElement): ListItem[] {
  const lists = [...container.querySelectorAll('script[type="application/ld+json"]')]
    .map(script => JSON.parse(script.textContent ?? ''))
    .filter(data => data['@type'] === 'BreadcrumbList')
  expect(lists).toHaveLength(1)
  return lists[0].itemListElement
}

/** The canonical URL; a relative one resolves against the root layout's metadataBase. */
function canonical(metadata: Metadata): string {
  const value = String(metadata.alternates?.canonical)
  return value.startsWith('/') ? `${ORIGIN}${value}` : value
}

const article = (...slug: string[]) => ({ params: Promise.resolve({ slug }) })
const page = (value: string) => ({ params: Promise.resolve({ page: value }) })

// Every page family that renders the breadcrumb. The homepage, /about/, /sitemap/ and /search/
// have none.
const pages: [string, () => Promise<ReactElement>, () => Promise<Metadata>, string[]][] = [
  [
    '/shop/best/kettlebells/',
    () => ShopArticlePage(article('shop', 'best', 'kettlebells')),
    () => shopArticleMetadata(article('shop', 'best', 'kettlebells')),
    ['Home', 'Shop', 'Kettlebells']
  ],
  [
    '/shop/best/br%C3%BCmate-water-bottles/',
    // Next.js passes the segment percent-encoded.
    () => ShopArticlePage(article('shop', 'best', 'br%C3%BCmate-water-bottles')),
    () => shopArticleMetadata(article('shop', 'best', 'br%C3%BCmate-water-bottles')),
    ['Home', 'Shop', 'BrüMate Water Bottles']
  ],
  ['/shop/', () => ShopPage(), () => shopMetadata(), ['Home', 'Shop']],
  [
    '/shop/page/2/',
    () => ShopPaginatedPage(page('2')),
    () => shopPageMetadata(page('2')),
    ['Home', 'Shop', 'Page 2']
  ],
  ['/boxers/', () => BoxersPage(), () => boxersMetadata(), ['Home', 'Boxers']],
  [
    '/boxers/page/2/',
    () => BoxersPaginatedPage(page('2')),
    () => boxersPageMetadata(page('2')),
    ['Home', 'Boxers', 'Page 2']
  ],
  [
    '/boxers/ana-alpha/',
    () => BoxerProfilePage({ params: Promise.resolve({ slug: 'ana-alpha' }) }),
    () => boxerMetadata({ params: Promise.resolve({ slug: 'ana-alpha' }) }),
    ['Home', 'Boxers', 'Ana Alpha']
  ],
  ['/divisions/', () => DivisionsPage(), () => divisionsMetadata(), ['Home', 'Divisions']],
  [
    '/divisions/heavy/',
    () => DivisionPage({ params: Promise.resolve({ division: 'heavy' }) }),
    () => divisionMetadata({ params: Promise.resolve({ division: 'heavy' }) }),
    ['Home', 'Divisions', 'Heavyweight']
  ],
  [
    '/divisions/heavy/page/2/',
    () => DivisionPaginatedPage({ params: Promise.resolve({ division: 'heavy', page: '2' }) }),
    () => divisionPageMetadata({ params: Promise.resolve({ division: 'heavy', page: '2' }) }),
    ['Home', 'Divisions', 'Heavyweight', 'Page 2']
  ],
  [
    '/privacy/',
    async () => PrivacyPolicyPage(),
    async () => privacyMetadata,
    ['Home', 'Privacy Policy']
  ],
  [
    '/terms/',
    async () => TermsOfServicePage(),
    async () => termsMetadata,
    ['Home', 'Terms of Service']
  ]
]

describe('breadcrumbs', () => {
  beforeEach(() => {
    mockGetCloudflareContext.mockResolvedValue({
      env: { DB: {} as D1Database, SITE_ENVIRONMENT: 'local' }
    } as never)
    mockGetBoxerProfile.mockResolvedValue({ boxer: boxer(), bouts: [] })
    mockListBoxers.mockImplementation(async (_db, { page = 1 }) => ({ ...listing, page }))
    mockListBoxersByDivision.mockImplementation(async (_db, _slug, { page = 1 }) => ({
      ...listing,
      page,
      division: heavy
    }))
    mockListDivisions.mockResolvedValue([{ ...heavy, boxerCount: 120 }])
  })

  it.each(pages)(
    '%s shows each crumb once, starting with one Home',
    async (_path, renderPage, _metadata, names) => {
      const crumbs = visibleCrumbs(render(await renderPage()).container)

      expect(crumbs.map(crumb => crumb.name)).toEqual(names)
      expect(crumbs.filter(crumb => crumb.name === 'Home')).toEqual([{ name: 'Home', href: '/' }])
      expect(new Set(crumbs.map(crumb => crumb.href)).size).toBe(crumbs.length)
      // Every crumb but the current page links to its page.
      expect(crumbs.at(-1)?.href).toBeNull()
      for (const crumb of crumbs.slice(0, -1)) {
        expect(crumb.href).toMatch(/^\/([^/]+\/)*$/)
      }
    }
  )

  it.each(pages)(
    '%s has a BreadcrumbList of the same crumbs at their canonical URLs',
    async (path, renderPage, metadata, names) => {
      const { container } = render(await renderPage())
      const crumbs = visibleCrumbs(container)
      const list = breadcrumbJsonLd(container)

      expect(list.map(item => item.position)).toEqual(names.map((_, index) => index + 1))
      expect(list.map(item => item.name)).toEqual(names)
      expect(list.every(item => item['@type'] === 'ListItem')).toBe(true)
      // The homepage is the origin without a slash; every other page is absolute, with one.
      expect(list[0]?.item).toBe(ORIGIN)
      for (const [index, item] of list.entries()) {
        if (index > 0) expect(item.item).toMatch(new RegExp(`^${ORIGIN}/\\S*/$`))
        const href = crumbs[index]?.href
        if (href) expect(item.item).toBe(toAbsoluteUrl(ORIGIN, href))
      }
      expect(new Set(list.map(item => item.item)).size).toBe(list.length)
      expect(list.at(-1)?.item).toBe(canonical(await metadata()))
      expect(list.at(-1)?.item).toBe(`${ORIGIN}${path}`)
    }
  )
})
