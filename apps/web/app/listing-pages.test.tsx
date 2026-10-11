// @vitest-environment happy-dom

import type {
  BoxerListItem,
  BoxerPage,
  DirectoryCounts,
  DivisionBoxerPage,
  DivisionWithCount,
  HomepageData
} from '@boxingundefeated/data-ops'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The pages read D1 through data-ops in the Worker; these stand in for its queries.
const mockGetCloudflareContext = vi.fn()
const mockConnection = vi.fn(async () => undefined)
const mockListBoxers = vi.fn<(...args: [unknown, { page?: number }]) => Promise<BoxerPage | null>>()
const mockListBoxersByDivision =
  vi.fn<(...args: [unknown, string, { page?: number }]) => Promise<DivisionBoxerPage | null>>()
const mockListDivisions = vi.fn<(...args: [unknown]) => Promise<DivisionWithCount[]>>()
const mockGetHomepageData = vi.fn<(...args: [unknown]) => Promise<HomepageData>>()
const mockGetDirectoryCounts = vi.fn<(...args: [unknown]) => Promise<DirectoryCounts>>()

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_HTTP_ERROR_FALLBACK;404')
  }
}))
// `connection()` throws outside a Next.js request.
vi.mock('next/server', () => ({ connection: () => mockConnection() }))
vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: (...args: unknown[]) => mockGetCloudflareContext(...args)
}))
vi.mock('@boxingundefeated/data-ops', async () => ({
  ...(await vi.importActual('@boxingundefeated/data-ops')),
  listBoxers: (db: unknown, options: { page?: number }) => mockListBoxers(db, options),
  listBoxersByDivision: (db: unknown, slug: string, options: { page?: number }) =>
    mockListBoxersByDivision(db, slug, options),
  listDivisions: (db: unknown) => mockListDivisions(db),
  getHomepageData: (db: unknown) => mockGetHomepageData(db),
  getDirectoryCounts: (db: unknown) => mockGetDirectoryCounts(db)
}))

import { createNotFoundMetadata } from '@/lib/metadata'
import { isRetiredPath } from '@/lib/routing/retired-paths'
import BoxersPage from './boxers/page'
import BoxersPaginatedPage, {
  generateMetadata as boxersPageMetadata
} from './boxers/page/[page]/page'
import DivisionPage, { generateMetadata as divisionMetadata } from './divisions/[division]/page'
import DivisionPaginatedPage, {
  generateMetadata as divisionPageMetadata
} from './divisions/[division]/page/[page]/page'
import DivisionsPage from './divisions/page'
import Home from './page'
import HtmlSitemapPage from './sitemap/page'

const NOT_FOUND = 'NEXT_HTTP_ERROR_FALLBACK;404'

let nextId = 1

function listed(slug: string, fields: Partial<BoxerListItem> = {}): BoxerListItem {
  return {
    id: nextId++,
    slug,
    name: slug
      .split('-')
      .map(word => word[0]!.toUpperCase() + word.slice(1))
      .join(' '),
    nicknames: null,
    avatarImage: null,
    nationality: null,
    proDivision: 'heavy',
    proStatus: null,
    proWins: 10,
    proWinsByKnockout: 5,
    proLosses: 1,
    proDraws: 0,
    proTotalBouts: 11,
    ...fields
  }
}

function division(slug: string, name: string, boxerCount: number, sortOrder = 0) {
  return { slug, name, proDivision: slug.replace('-', ' '), sortOrder, boxerCount }
}

const links = () => [...document.querySelectorAll('a')].map(link => link.getAttribute('href'))

describe('listing pages', () => {
  beforeEach(() => {
    mockGetCloudflareContext.mockResolvedValue({
      env: { DB: {} as D1Database, SITE_ENVIRONMENT: 'local' }
    } as never)
  })

  it('prerenders none of them: each renders on request', async () => {
    for (const page of [
      await import('./boxers/page/[page]/page'),
      await import('./divisions/[division]/page'),
      await import('./divisions/[division]/page/[page]/page')
    ]) {
      expect('generateStaticParams' in page).toBe(false)
    }
  })

  it('renders /boxers/page/<n>/ from D1, on request', async () => {
    mockListBoxers.mockResolvedValue({
      items: [listed('ana-alpha', { nicknames: '"The Hammer"' }), listed('bob-bravo')],
      page: 2,
      pageSize: 48,
      totalItems: 98,
      totalPages: 3
    })
    const params = { params: Promise.resolve({ page: '2' }) }

    render(await BoxersPaginatedPage(params))

    expect(mockConnection).toHaveBeenCalled()
    expect(mockListBoxers).toHaveBeenCalledWith(expect.anything(), { page: 2 })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Boxers - Page 2')
    expect(links()).toEqual(
      expect.arrayContaining([
        '/boxers/ana-alpha/',
        '/boxers/bob-bravo/',
        '/boxers/',
        '/boxers/page/3/'
      ])
    )
    expect(screen.getByText('Showing 49-50 of 98 boxers')).toBeInTheDocument()
    // The data quotes every nickname; the card shows it in one pair of quotes (#98).
    expect(screen.getByText('"The Hammer"')).toBeInTheDocument()
    expect((await boxersPageMetadata(params)).alternates?.canonical).toBe(
      'http://localhost:8787/boxers/page/2/'
    )
  })

  it('is a 404 for page 1, a page out of range, or a page number in any other spelling', async () => {
    mockListBoxers.mockResolvedValue(null)
    for (const page of ['1', '999', '0', '02', '2abc']) {
      const params = { params: Promise.resolve({ page }) }
      await expect(BoxersPaginatedPage(params)).rejects.toThrow(NOT_FOUND)
      await expect(boxersPageMetadata(params)).resolves.toEqual(createNotFoundMetadata())
    }
    // Only the page that might exist reached D1.
    expect(mockListBoxers.mock.calls.map(([, options]) => options)).toEqual([
      { page: 999 },
      { page: 999 }
    ])
  })

  it('renders /boxers/ from page 1', async () => {
    mockListBoxers.mockResolvedValue({
      items: [listed('ana-alpha')],
      page: 1,
      pageSize: 48,
      totalItems: 5570,
      totalPages: 117
    })

    render(await BoxersPage())

    expect(mockListBoxers).toHaveBeenCalledWith(expect.anything(), { page: 1 })
    expect(links()).toEqual(expect.arrayContaining(['/boxers/page/2/', '/boxers/page/117/']))
    expect(screen.getByText('Showing 1-1 of 5570 boxers')).toBeInTheDocument()
  })

  it('renders a division and its pages from D1, with the division name from D1', async () => {
    const heavy = { slug: 'heavy', name: 'Heavyweight', proDivision: 'heavy', sortOrder: 0 }
    mockListBoxersByDivision.mockImplementation(async (_db, _slug, { page = 1 }) => ({
      items: [listed(`boxer-${page}`)],
      page,
      pageSize: 48,
      totalItems: 120,
      totalPages: 3,
      division: heavy
    }))

    render(await DivisionPage({ params: Promise.resolve({ division: 'heavy' }) }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Heavyweight Boxers')
    expect(links()).toEqual(expect.arrayContaining(['/divisions/heavy/page/2/']))

    const params = { params: Promise.resolve({ division: 'heavy', page: '3' }) }
    render(await DivisionPaginatedPage(params))
    expect(mockListBoxersByDivision).toHaveBeenLastCalledWith(expect.anything(), 'heavy', {
      page: 3
    })
    expect(screen.getByText('Showing 97-97 of 120 boxers')).toBeInTheDocument()

    const metadata = await divisionPageMetadata(params)
    expect(metadata.title).toBe('Heavyweight Boxers - Page 3 - Boxing Undefeated')
    expect(metadata.alternates?.canonical).toBe('http://localhost:8787/divisions/heavy/page/3/')
    expect(
      (await divisionMetadata({ params: Promise.resolve({ division: 'heavy' }) })).alternates
        ?.canonical
    ).toBe('http://localhost:8787/divisions/heavy/')
  })

  it('is a 404 for an unknown division or a division page out of range', async () => {
    mockListBoxersByDivision.mockResolvedValue(null)

    const unknown = { params: Promise.resolve({ division: 'super-duper' }) }
    await expect(DivisionPage(unknown)).rejects.toThrow(NOT_FOUND)
    await expect(divisionMetadata(unknown)).resolves.toEqual(createNotFoundMetadata())

    for (const page of ['1', '99', '02']) {
      const params = { params: Promise.resolve({ division: 'heavy', page }) }
      await expect(DivisionPaginatedPage(params)).rejects.toThrow(NOT_FOUND)
      await expect(divisionPageMetadata(params)).resolves.toEqual(createNotFoundMetadata())
    }
  })

  it('renders /divisions/ with the counts from D1', async () => {
    mockListDivisions.mockResolvedValue([
      division('heavy', 'Heavyweight', 1234),
      division('light-fly', 'Light Flyweight', 0, 15)
    ])

    render(await DivisionsPage())

    expect(links().filter(href => href?.startsWith('/divisions/'))).toEqual([
      '/divisions/heavy/',
      '/divisions/light-fly/'
    ])
    expect(screen.getByText('1,234 boxers')).toBeInTheDocument()
    expect(screen.getByText('0 boxers')).toBeInTheDocument()
  })

  it('renders the homepage stats, top fighters and division counts from D1', async () => {
    mockGetHomepageData.mockResolvedValue({
      stats: { totalBoxers: 5570, activeBoxers: 4000, totalBouts: 109541, eliteBoxers: 321 },
      featuredBoxers: [listed('len-wickwar', { proWins: 340, proLosses: 88, proDraws: 0 })],
      divisions: [division('heavy', 'Heavyweight', 700), division('fly', 'Flyweight', 25, 14)]
    })

    const { container } = render(await Home())

    expect(container).toHaveTextContent('records and statistics for 5,570 professional boxers')
    for (const value of ['4,000', '109,541', '321', '340-88-0']) {
      expect(screen.getByText(value)).toBeInTheDocument()
    }
    expect(links()).toContain('/boxers/len-wickwar/')
    const card = (slug: string) => container.querySelector(`a[href="/divisions/${slug}/"]`)
    expect(card('heavy')).toHaveTextContent('Heavyweight700boxers')
    expect(card('fly')).toHaveTextContent('Flyweight25boxers')
    // A division D1 doesn't list counts as empty rather than failing the homepage.
    expect(card('middle')).toHaveTextContent('Middleweight0boxers')
  })

  it('links the HTML sitemap to every listing page D1 counts', async () => {
    mockGetDirectoryCounts.mockResolvedValue({
      totalBoxers: 97,
      divisions: [division('heavy', 'Heavyweight', 49), division('minimum', 'Minimumweight', 0, 16)]
    })

    render(await HtmlSitemapPage())

    const hrefs = links()
    expect(hrefs).toEqual(
      expect.arrayContaining(['/boxers/page/3/', '/divisions/heavy/page/2/', '/divisions/minimum/'])
    )
    for (const missing of ['/boxers/page/4/', '/divisions/heavy/page/3/']) {
      expect(hrefs).not.toContain(missing)
    }
    expect(hrefs).toContain('/sitemap/')
    // `/blog/`, `/brands/` and `/shop/` answer 410 (#59, #94).
    expect(hrefs.filter(href => isRetiredPath(href ?? ''))).toEqual([])
    expect(hrefs.filter(href => href?.endsWith('.xml'))).toEqual([
      '/sitemap-index.xml',
      '/sitemap-pages.xml',
      '/sitemap-boxers.xml',
      '/sitemap-divisions.xml'
    ])
    // Listing pages only, never a profile.
    expect(hrefs.filter(href => /^\/boxers\/(?!page\/)[^/]+\/$/.test(href ?? ''))).toEqual([])
  })

  it('fails closed without the DB binding', async () => {
    mockGetCloudflareContext.mockResolvedValue({ env: { SITE_ENVIRONMENT: 'production' } } as never)

    const failedClosed = { name: 'DataBindingError' }
    await expect(BoxersPage()).rejects.toMatchObject(failedClosed)
    await expect(Home()).rejects.toMatchObject(failedClosed)
    await expect(DivisionsPage()).rejects.toMatchObject(failedClosed)
    expect(mockListBoxers).not.toHaveBeenCalled()
  })
})
