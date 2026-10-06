import { act, fireEvent, render, screen } from '@testing-library/react'
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

function json(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response
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
  })

  it('debounces typing into one /api/search request and links each result to its profile', async () => {
    fetchMock.mockResolvedValue(json(floyd))
    render(<SearchPage />)
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
  })

  it('says when nothing matches', async () => {
    fetchMock.mockResolvedValue(json({ query: 'zzz', results: [], truncated: false }))
    render(<SearchPage />)
    await type('zzz')
    await settle()

    expect(await screen.findByText('No boxers found matching "zzz"')).toBeInTheDocument()
  })

  it('says when there are more matches than it shows', async () => {
    fetchMock.mockResolvedValue(json({ ...floyd, truncated: true }))
    render(<SearchPage />)
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
    render(<SearchPage />)
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
    render(<SearchPage />)

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
