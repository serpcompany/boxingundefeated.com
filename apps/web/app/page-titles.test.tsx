import { readdirSync } from 'node:fs'
import type { BoxerListingPage, BoxerProfileView, DivisionListingPage } from '@/lib/boxer-data'

// The pages' metadata reads D1 through lib/boxer-data; these stand in for it.
const mockGetBoxerProfile = jest.fn<Promise<BoxerProfileView | null>, [string]>()
const mockGetBoxersPage = jest.fn<Promise<BoxerListingPage | null>, [number]>()
const mockGetDivisionPage = jest.fn<Promise<DivisionListingPage | null>, [string, number]>()

jest.mock('@/lib/boxer-data', () => ({
  getBoxerProfile: (slug: string) => mockGetBoxerProfile(slug),
  getBoxersPage: (page: number) => mockGetBoxersPage(page),
  getDivisionPage: (slug: string, page: number) => mockGetDivisionPage(slug, page)
}))
// The article body is beside the point here, and remark is ESM only.
jest.mock('remark', () => ({
  remark: () => ({ use: () => ({ process: async (markdown: string) => markdown }) })
}))
jest.mock('remark-html', () => ({ __esModule: true, default: () => undefined }))

import type { Metadata } from 'next'
import { createNotFoundMetadata } from '@/lib/metadata'
import { getSiteOrigin } from '@/lib/site-config'
import { metadata as privacyMetadata } from './(legal)/privacy/page'
import { metadata as termsMetadata } from './(legal)/terms/page'
import { generateMetadata as shopArticleMetadata } from './[...slug]/page'
import { metadata as aboutMetadata } from './about/page'
import { generateMetadata as boxerMetadata } from './boxers/[slug]/page'
import { generateMetadata as boxersMetadata } from './boxers/page'
import { generateMetadata as boxersPageMetadata } from './boxers/page/[page]/page'
import { generateMetadata as divisionMetadata } from './divisions/[division]/page'
import { generateMetadata as divisionPageMetadata } from './divisions/[division]/page/[page]/page'
import { generateMetadata as divisionsMetadata } from './divisions/page'
import { metadata as notFoundMetadata } from './not-found'
import { generateMetadata as homeMetadata } from './page'
import { metadata as searchMetadata } from './search/layout'
import { generateMetadata as shopMetadata } from './shop/page'
import { generateMetadata as shopPageMetadata } from './shop/page/[page]/page'
import { generateMetadata as htmlSitemapMetadata } from './sitemap/page'

/**
 * Every page's title is `<page title> - Boxing Undefeated`, the homepage's its own, and its
 * og:title and twitter:title are the same title (#87). Next.js replaces the root layout's
 * `openGraph` and `twitter` with a page's whole, so a page that sets its title alone is shared as
 * the root's, the bare site name: its family fails here. So does a page file this table misses.
 */
interface PageFamily {
  /** The page file under app/ whose metadata this is. */
  file: string
  /** The canonical path, also og:url; null for the homepage (it renders both itself) and 404s. */
  path: string | null
  title: string
  metadata: () => Metadata | Promise<Metadata>
}

const params = <T,>(value: T) => ({ params: Promise.resolve(value) })

const families: PageFamily[] = [
  {
    file: 'page.tsx',
    path: null,
    title: 'Boxing Undefeated - Professional Boxers Database',
    metadata: () => homeMetadata()
  },
  {
    file: 'boxers/page.tsx',
    path: '/boxers/',
    title: 'Boxers Directory - Boxing Undefeated',
    metadata: () => boxersMetadata()
  },
  {
    file: 'boxers/page/[page]/page.tsx',
    path: '/boxers/page/2/',
    title: 'Boxers Directory - Page 2 - Boxing Undefeated',
    metadata: () => boxersPageMetadata(params({ page: '2' }))
  },
  {
    file: 'boxers/[slug]/page.tsx',
    path: '/boxers/manuel-ortiz/',
    title: 'Manuel Ortiz - Professional Boxer - Boxing Undefeated',
    metadata: () => boxerMetadata(params({ slug: 'manuel-ortiz' }))
  },
  {
    file: 'divisions/page.tsx',
    path: '/divisions/',
    title: 'Boxing Divisions - Boxing Undefeated',
    metadata: () => divisionsMetadata()
  },
  {
    file: 'divisions/[division]/page.tsx',
    path: '/divisions/heavy/',
    title: 'Heavyweight Boxers - Boxing Undefeated',
    metadata: () => divisionMetadata(params({ division: 'heavy' }))
  },
  {
    file: 'divisions/[division]/page/[page]/page.tsx',
    path: '/divisions/heavy/page/2/',
    title: 'Heavyweight Boxers - Page 2 - Boxing Undefeated',
    metadata: () => divisionPageMetadata(params({ division: 'heavy', page: '2' }))
  },
  {
    file: 'shop/page.tsx',
    path: '/shop/',
    title: 'Shop Guides - Boxing Undefeated',
    metadata: () => shopMetadata()
  },
  {
    file: 'shop/page/[page]/page.tsx',
    path: '/shop/page/2/',
    title: 'Shop Guides - Page 2 - Boxing Undefeated',
    metadata: () => shopPageMetadata(params({ page: '2' }))
  },
  {
    file: '[...slug]/page.tsx',
    path: '/shop/best/1-inch-thick-yoga-mats/',
    title: '1 Inch Thick Yoga Mats - Boxing Undefeated',
    metadata: () =>
      shopArticleMetadata(params({ slug: ['shop', 'best', '1-inch-thick-yoga-mats'] }))
  },
  {
    // Next.js passes the segment percent-encoded.
    file: '[...slug]/page.tsx',
    path: '/shop/best/br%C3%BCmate-water-bottles/',
    title: 'BrüMate Water Bottles - Boxing Undefeated',
    metadata: () =>
      shopArticleMetadata(params({ slug: ['shop', 'best', 'br%C3%BCmate-water-bottles'] }))
  },
  {
    file: 'about/page.tsx',
    path: '/about/',
    title: 'About - Boxing Undefeated',
    metadata: () => aboutMetadata
  },
  {
    file: '(legal)/privacy/page.tsx',
    path: '/privacy/',
    title: 'Privacy Policy - Boxing Undefeated',
    metadata: () => privacyMetadata
  },
  {
    file: '(legal)/terms/page.tsx',
    path: '/terms/',
    title: 'Terms of Service - Boxing Undefeated',
    metadata: () => termsMetadata
  },
  {
    // A client component: its metadata is the layout's.
    file: 'search/page.tsx',
    path: '/search/',
    title: 'Search Boxers - Boxing Undefeated',
    metadata: () => searchMetadata
  },
  {
    file: 'sitemap/page.tsx',
    path: '/sitemap/',
    title: 'HTML Sitemap - Boxing Undefeated',
    metadata: () => htmlSitemapMetadata()
  },
  {
    // The first HTML of every 404 (lib/worker/not-found-page.ts).
    file: 'not-found.tsx',
    path: null,
    title: 'Page Not Found - Boxing Undefeated',
    metadata: () => notFoundMetadata
  }
]

/** The metadata of each page that calls `notFound()`, where it does. */
const notFoundPages: Array<[string, () => Promise<Metadata>]> = [
  ['/boxers/page/99999/', () => boxersPageMetadata(params({ page: '99999' }))],
  ['/boxers/no-such-boxer/', () => boxerMetadata(params({ slug: 'no-such-boxer' }))],
  [
    '/divisions/no-such-division/',
    () => divisionMetadata(params({ division: 'no-such-division' }))
  ],
  [
    '/divisions/heavy/page/99999/',
    () => divisionPageMetadata(params({ division: 'heavy', page: '99999' }))
  ],
  [
    '/shop/best/no-such-article/',
    () => shopArticleMetadata(params({ slug: ['shop', 'best', 'no-such-article'] }))
  ]
]

function listing(currentPage: number): BoxerListingPage {
  return {
    items: [],
    currentPage,
    totalItems: 120,
    totalPages: 3,
    startIndex: (currentPage - 1) * 48,
    endIndex: currentPage * 48
  }
}

beforeEach(() => {
  mockGetBoxerProfile.mockImplementation(async slug =>
    slug === 'manuel-ortiz'
      ? { boxer: { slug, name: 'Manuel Ortiz', bio: null }, bouts: [], opponentLinks: new Map() }
      : null
  )
  mockGetBoxersPage.mockImplementation(async page => (page <= 3 ? listing(page) : null))
  mockGetDivisionPage.mockImplementation(async (slug, page) =>
    slug === 'heavy' && page <= 3
      ? { ...listing(page), division: { slug, name: 'Heavyweight' } }
      : null
  )
})

/** Every page file under app/, as the table names them. */
function pageFiles(): string[] {
  return readdirSync(__dirname, { recursive: true, encoding: 'utf8' })
    .map(file => file.split('\\').join('/'))
    .filter(file => /(^|\/)page\.tsx$/.test(file) || file === 'not-found.tsx')
    .sort()
}

describe('page titles', () => {
  it('covers every page file', () => {
    expect([...new Set(families.map(family => family.file))].sort()).toEqual(pageFiles())
  })

  it.each(families.map(family => [family.title, family] as const))(
    '%s: og:title and twitter:title are the title, og:url the canonical',
    async (_title, family) => {
      const metadata = await family.metadata()

      expect(metadata.title).toBe(family.title)
      expect(metadata.openGraph?.title).toBe(family.title)
      expect(metadata.twitter?.title).toBe(family.title)

      const canonical = metadata.alternates?.canonical
      expect(metadata.openGraph?.url).toEqual(canonical)
      if (family.path === null) {
        expect(canonical).toBeUndefined()
      } else {
        expect(new URL(String(canonical), getSiteOrigin()).href).toBe(
          `${getSiteOrigin()}${family.path}`
        )
      }
    }
  )

  it.each(notFoundPages)('%s has the not-found page metadata', async (_path, metadata) => {
    await expect(metadata()).resolves.toEqual(createNotFoundMetadata())
    expect(createNotFoundMetadata().title).toBe('Page Not Found - Boxing Undefeated')
  })
})
