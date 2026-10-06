import type { BoutWithOpponent, Boxer, BoxerProfile } from '@boxingundefeated/data-ops'
import { render, screen, waitFor } from '@testing-library/react'

// `loadPage` gives a test a fresh module registry, mocks included, so the mocks delegate to these
// shared functions.
const mockGetCloudflareContext = jest.fn()
const mockQueryBoxerProfile = jest.fn<Promise<BoxerProfile | null>, [unknown, string]>()

jest.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_HTTP_ERROR_FALLBACK;404')
  }
}))
jest.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: (...args: unknown[]) => mockGetCloudflareContext(...args)
}))
jest.mock('@boxingundefeated/data-ops', () => ({
  ...jest.requireActual('@boxingundefeated/data-ops'),
  getBoxerProfile: (db: unknown, slug: string) => mockQueryBoxerProfile(db, slug)
}))

type PageModule = typeof import('./page')

// next.config.ts inlines SITE_BUILD_OUTPUT into every build; the module reads it when it loads.
process.env.SITE_BUILD_OUTPUT = 'export'
const { default: BoxerPage, generateMetadata } = require('./page') as PageModule

/**
 * The page module as a build target compiles it: next.config.ts inlines SITE_BUILD_OUTPUT, so
 * `generateStaticParams` is fixed when the module loads. Not for rendering: the fresh registry
 * has its own React.
 */
function loadPage(target: 'export' | 'worker'): PageModule {
  process.env.SITE_BUILD_OUTPUT = target
  let page: PageModule | undefined
  jest.isolateModules(() => {
    page = require('./page')
  })
  return page!
}

/** Reads go to the target's source at request time. */
function buildTarget(target: 'export' | 'worker') {
  process.env.SITE_BUILD_OUTPUT = target
}

const params = (slug: string) => ({ params: Promise.resolve({ slug }) })

function d1Boxer(fields: Partial<Boxer>): Boxer {
  return {
    id: 1,
    boxrecId: '1',
    boxrecUrl: 'https://boxrec.com/en/box-pro/1',
    slug: 'ana-alpha',
    name: 'Ana Alpha',
    birthName: null,
    nicknames: null,
    avatarImage: null,
    residence: null,
    birthPlace: null,
    dateOfBirth: null,
    gender: null,
    nationality: null,
    height: null,
    reach: null,
    stance: null,
    bio: null,
    promoters: [],
    trainers: [],
    managers: [],
    gym: null,
    proDebutDate: null,
    proDivision: null,
    proWins: 0,
    proWinsByKnockout: 0,
    proLosses: 0,
    proLossesByKnockout: 0,
    proDraws: 0,
    proTotalBouts: 0,
    proTotalRounds: null,
    proStatus: null,
    createdAt: null,
    updatedAt: null,
    importedAt: '2026-10-06 00:00:00',
    ...fields
  }
}

// Each bout's position comes from its index here. Avoid the column's name in apps/web: Tailwind
// scans these files and would add a CSS utility of that name to the static export.
function d1Bout(index: number, opponentName: string, opponentSlug: string | null) {
  return {
    id: index + 1,
    boxerId: 1,
    boxrecId: `bout-${index}`,
    boutDate: '2024-01-01',
    opponentName,
    opponentBoxerId: opponentSlug ? 2 : null,
    opponentWeight: null,
    opponentRecord: null,
    eventName: null,
    refereeName: null,
    judge1Name: null,
    judge1Score: null,
    judge2Name: null,
    judge2Score: null,
    judge3Name: null,
    judge3Score: null,
    numRoundsScheduled: null,
    result: 'win',
    resultMethod: 'KO',
    resultRound: '3',
    eventPageLink: null,
    boutPageLink: `https://boxrec.com/en/event/1/bout-${index}`,
    scorecardsPageLink: null,
    titleFight: false,
    opponentSlug
  } as BoutWithOpponent
}

/** The `<dd>` after the `<dt>` with this label, or null when the page leaves the field out. */
function detail(label: string): HTMLElement | null {
  const term = screen.queryByText(label, { selector: 'dt' })
  return (term?.nextElementSibling as HTMLElement | null) ?? null
}

afterEach(() => {
  process.env.SITE_BUILD_OUTPUT = 'export'
})

describe('boxer profile page, unknown build target', () => {
  it('fails closed instead of guessing a data source', async () => {
    expect(() => loadPage('static' as never)).toThrow(/SITE_BUILD_OUTPUT is "static"/)

    process.env.SITE_BUILD_OUTPUT = ''
    await expect(BoxerPage(params('jesse-hart'))).rejects.toMatchObject({
      name: 'BuildTargetError'
    })
    expect(mockQueryBoxerProfile).not.toHaveBeenCalled()
  })
})

describe('boxer profile page, static export', () => {
  it('prerenders every boxer from the committed JSON', async () => {
    const page = loadPage('export')
    const slugs = await page.generateStaticParams!()
    expect(slugs.length).toBeGreaterThan(5000)
    expect(slugs).toContainEqual({ slug: 'jesse-hart' })
  })

  it('renders the JSON record, with newline-separated staff as one value', async () => {
    buildTarget('export')
    render(await BoxerPage(params('jesse-hart')))

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      // The source quotes nicknames and the page quotes them again: today's output, kept.
      'Jesse Hart""Hard Work""'
    )
    expect(detail('Managers')?.textContent).toBe('Ron Dove\nBob Kane')
    expect(detail('Trainers')).toBeNull()
    expect(mockQueryBoxerProfile).not.toHaveBeenCalled()
  })
})

describe('boxer profile page, Worker', () => {
  beforeEach(() => {
    mockGetCloudflareContext.mockResolvedValue({
      env: { DB: {} as D1Database, SITE_ENVIRONMENT: 'local' }
    } as never)
  })

  it('prerenders nothing', () => {
    expect(loadPage('worker').generateStaticParams).toBeUndefined()
  })

  it('renders the D1 profile like the static page: staff lists, opponent links', async () => {
    const profile: BoxerProfile = {
      boxer: d1Boxer({
        nicknames: '"Hard Work"',
        managers: ['Ron Dove', 'Bob Kane'],
        proWins: 1,
        proTotalBouts: 2
      }),
      bouts: [d1Bout(0, 'Linked Opponent', 'linked-opponent'), d1Bout(1, 'Unknown Opponent', null)]
    }
    mockQueryBoxerProfile.mockResolvedValue(profile)
    buildTarget('worker')

    render(await BoxerPage(params('ana-alpha')))

    expect(mockQueryBoxerProfile).toHaveBeenCalledWith(expect.anything(), 'ana-alpha')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ana Alpha""Hard Work""')
    expect(detail('Managers')?.textContent).toBe('Ron Dove\nBob Kane')
    for (const empty of ['Trainers', 'Promoters', 'Gym', 'Total Rounds']) {
      expect(detail(empty)).toBeNull()
    }
    expect(detail('Total Bouts')?.textContent).toBe('2')
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Linked Opponent' })).toHaveAttribute(
        'href',
        '/boxers/linked-opponent/'
      )
    )
    expect(screen.getByText('Unknown Opponent').tagName).toBe('SPAN')
  })

  it('builds the metadata from the same profile', async () => {
    mockQueryBoxerProfile.mockResolvedValue({
      boxer: d1Boxer({ bio: '<p>Southpaw.</p>' }),
      bouts: []
    })
    buildTarget('worker')
    const metadata = await generateMetadata(params('ana-alpha'))

    expect(metadata.title).toBe('Ana Alpha - Professional Boxer')
    expect(metadata.description).toBe(
      'Professional boxing record and statistics for Ana Alpha. <p>Southpaw.</p>'
    )
    expect(metadata.alternates?.canonical).toBe('http://localhost:8787/boxers/ana-alpha/')
  })

  it('is a 404 for a slug D1 does not have', async () => {
    mockQueryBoxerProfile.mockResolvedValue(null)
    buildTarget('worker')

    await expect(BoxerPage(params('world'))).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    await expect(generateMetadata(params('world'))).resolves.toEqual({
      title: 'Boxer Not Found'
    })
  })

  it('fails closed without the DB binding instead of falling back to the JSON', async () => {
    mockGetCloudflareContext.mockResolvedValue({
      env: { SITE_ENVIRONMENT: 'production' }
    } as never)
    buildTarget('worker')

    const failedClosed = { name: 'DataBindingError', message: expect.stringContaining('DB') }
    await expect(BoxerPage(params('jesse-hart'))).rejects.toMatchObject(failedClosed)
    await expect(generateMetadata(params('jesse-hart'))).rejects.toMatchObject(failedClosed)
    expect(mockQueryBoxerProfile).not.toHaveBeenCalled()
  })
})
