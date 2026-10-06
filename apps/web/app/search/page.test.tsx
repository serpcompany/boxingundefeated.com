import { act, fireEvent, render, screen } from '@testing-library/react'
import type React from 'react'
import type { SearchResponse } from '@/lib/search/contract'
import SearchPage from './page'

const floyd: SearchResponse = {
  query: 'floyd',
  results: [
    {
      slug: 'floyd-mayweather-jr',
      name: 'Floyd Mayweather Jr',
      nicknames: '"Money,Pretty Boy"',
      nationality: 'USA',
      division: 'welter',
      wins: 50,
      losses: 0,
      draws: 0
    }
  ],
  truncated: false
}

const staticIndex = [
  {
    name: 'Manuel Ortiz',
    slug: 'manuel-ortiz',
    division: 'bantam',
    wins: 99,
    losses: 28,
    draws: 3,
    nationality: 'USA'
  },
  {
    name: 'Julio Cesar Chavez',
    slug: 'julio-cesar-chavez',
    division: 'super light',
    wins: 107,
    losses: 6,
    draws: 2,
    nationality: 'Mexico'
  },
  {
    name: 'Floyd Mayweather Jr',
    slug: 'floyd-mayweather-jr',
    division: 'welter',
    wins: 50,
    losses: 0,
    draws: 0,
    nationality: 'USA'
  }
]

function json(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response
}

/** The build target next.config.ts inlines; the page reads it on render. */
function loadPage(buildOutput: 'worker' | 'export'): React.ComponentType {
  process.env.SITE_BUILD_OUTPUT = buildOutput
  return SearchPage
}

async function type(value: string) {
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search boxers' }), { target: { value } })
}

async function settle(ms = 250) {
  await act(async () => {
    jest.advanceTimersByTime(ms)
  })
}

describe('search page', () => {
  const fetchMock = jest.fn()

  beforeEach(() => {
    jest.useFakeTimers()
    global.fetch = fetchMock
  })

  afterEach(() => {
    jest.useRealTimers()
    fetchMock.mockReset()
    delete process.env.SITE_BUILD_OUTPUT
  })

  describe('in the Worker', () => {
    it('debounces typing into one /api/search request and links each result to its profile', async () => {
      fetchMock.mockResolvedValue(json(floyd))
      const Page = loadPage('worker')
      render(<Page />)
      expect(screen.getByText('Start typing to search for boxers')).toBeInTheDocument()

      await type('f')
      await type('fl')
      await type('Floyd')
      expect(screen.getByText('Searching...')).toBeInTheDocument()
      await settle()

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock.mock.calls[0][0]).toBe('/api/search?q=Floyd')
      expect(await screen.findByText('Found 1 boxer')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Floyd Mayweather Jr' })).toHaveAttribute(
        'href',
        '/boxers/floyd-mayweather-jr/'
      )
      expect(screen.getByText('"Money,Pretty Boy"')).toBeInTheDocument()
      expect(screen.getByText('50-0-0')).toBeInTheDocument()
      expect(fetchMock).not.toHaveBeenCalledWith('/search/boxer-search-index.json')
    })

    it('says when nothing matches', async () => {
      fetchMock.mockResolvedValue(json({ query: 'zzz', results: [], truncated: false }))
      const Page = loadPage('worker')
      render(<Page />)
      await type('zzz')
      await settle()

      expect(await screen.findByText('No boxers found matching "zzz"')).toBeInTheDocument()
    })

    it('says when there are more matches than it shows', async () => {
      fetchMock.mockResolvedValue(json({ ...floyd, truncated: true }))
      const Page = loadPage('worker')
      render(<Page />)
      await type('floyd')
      await settle()

      expect(
        await screen.findByText(
          'Showing the top 1 matches. Type more of the name to narrow them down.'
        )
      ).toBeInTheDocument()
    })

    it('says when boxer data is being updated (503)', async () => {
      fetchMock.mockResolvedValue(json({ error: 'updating' }, 503))
      const Page = loadPage('worker')
      render(<Page />)
      await type('floyd')
      await settle()

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Boxer data is being updated. Please try again in a few minutes.'
      )
    })

    it('never lets an older answer replace a newer one', async () => {
      let resolveFirst: (response: Response) => void = () => {}
      fetchMock
        .mockImplementationOnce(
          () =>
            new Promise<Response>(resolve => {
              resolveFirst = resolve
            })
        )
        .mockResolvedValueOnce(json({ query: 'ortiz', results: [], truncated: false }))
      const Page = loadPage('worker')
      render(<Page />)

      await type('floyd')
      await settle()
      await type('ortiz')
      await settle()
      await act(async () => resolveFirst(json(floyd)))

      expect(await screen.findByText('No boxers found matching "ortiz"')).toBeInTheDocument()
      expect(screen.queryByText('Floyd Mayweather Jr')).not.toBeInTheDocument()
      expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true)
    })
  })

  describe('in the static export', () => {
    it("searches today's committed index by name, country or division, without the API", async () => {
      fetchMock.mockResolvedValue(json(staticIndex))
      const Page = loadPage('export')
      render(<Page />)
      expect(screen.getByPlaceholderText('Search by name, country, or division...')).toBeVisible()

      await type('mexico')
      await settle()

      expect(await screen.findByText('Found 1 boxer')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Julio Cesar Chavez' })).toHaveAttribute(
        'href',
        '/boxers/julio-cesar-chavez/'
      )
      await type('USA')
      await settle()
      expect(await screen.findByText('Found 2 boxers')).toBeInTheDocument()
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith('/search/boxer-search-index.json')
    })
  })
})
