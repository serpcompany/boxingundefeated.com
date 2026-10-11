import { render, screen } from '@testing-library/react'
// The Node build: jsdom has no MessageChannel, which the browser build needs.
import { renderToString } from 'react-dom/server.node'
import type { ProfileBout } from '@/lib/boxer-data'
import { FightHistory } from './fight-history'

function makeBout(opponentName: string, fields: Partial<ProfileBout> = {}): ProfileBout {
  return {
    boxrecId: `bout-${opponentName}`,
    boutDate: '2024-01-01',
    opponentName,
    eventName: 'Test Event',
    result: 'win',
    ...fields
  }
}

const opponents = (count: number) => Array.from({ length: count }, (_, i) => `Opponent ${i + 1}`)

/** The server's HTML, parsed: what a crawler that doesn't run JavaScript gets. */
function serverHtml(bouts: ProfileBout[]): HTMLElement {
  const container = document.createElement('div')
  container.innerHTML = renderToString(<FightHistory bouts={bouts} opponentLinks={new Map()} />)
  return container
}

describe('FightHistory', () => {
  it('links opponents with a profile and leaves the others unlinked', () => {
    const bouts = [makeBout('William Lawrence Stribling'), makeBout('Unknown Opponent')]
    // Opponent slugs come from D1 (bouts.opponent_boxer_id), matched by the importer.
    const opponentLinks = new Map([['William Lawrence Stribling', 'young-stribling']])

    render(<FightHistory bouts={bouts} opponentLinks={opponentLinks} />)

    expect(screen.getByRole('link', { name: 'William Lawrence Stribling' })).toHaveAttribute(
      'href',
      '/boxers/young-stribling/'
    )
    expect(screen.queryByRole('link', { name: 'Unknown Opponent' })).not.toBeInTheDocument()
  })

  it('renders every bout in the HTML, the first 10 shown and the rest in a closed <details>', () => {
    const names = opponents(12)
    const html = serverHtml(names.map(name => makeBout(name)))

    expect(html.textContent).toContain('Fight History (12 Bouts)')
    for (const name of names) expect(html.textContent).toContain(name)

    const details = html.querySelector('details')
    expect(details).not.toBeNull()
    expect(details?.hasAttribute('open')).toBe(false)
    expect(details?.querySelector('summary')?.textContent).toBe('Show 2 more fights →')
    expect(details?.textContent).toContain('Opponent 11')
    expect(details?.textContent).toContain('Opponent 12')
    expect(details?.textContent).not.toContain('Opponent 10')
  })

  it('is one list item per bout, numbered on after "Show more"', () => {
    const html = serverHtml(opponents(12).map(name => makeBout(name)))
    const [shown, more] = [...html.querySelectorAll('ol')]

    expect(html.querySelectorAll('li')).toHaveLength(12)
    expect(shown?.querySelectorAll('li')).toHaveLength(10)
    expect(more?.closest('details')).not.toBeNull()
    expect(more?.getAttribute('start')).toBe('11')
    expect(more?.querySelectorAll('li')).toHaveLength(2)
  })

  it('says "fight" and "Bout" for one, as for James Osborne\'s 11 bouts (#98)', () => {
    const html = serverHtml(opponents(11).map(name => makeBout(name)))

    expect(html.querySelector('summary')?.textContent).toBe('Show 1 more fight →')
    expect(serverHtml([makeBout('Opponent 1')]).textContent).toContain('Fight History (1 Bout)')
  })

  it('has no stray bullet for a bout with no event name (#98)', () => {
    const html = serverHtml([
      makeBout('Named Event'),
      makeBout('Empty Event', { eventName: '' }),
      makeBout('No Event', { eventName: null }),
      makeBout('Blank Event', { eventName: '  ' })
    ])
    const details = [...html.querySelectorAll('li .text-muted-foreground')].map(e => e.textContent)

    expect(details).toEqual(['2024-01-01 • Test Event', '2024-01-01', '2024-01-01', '2024-01-01'])
  })

  it('wraps a very long opponent name in its column rather than widening the page (#98)', () => {
    // 70 characters with no break, like the token #96's review injected: as a flex item with the
    // default `min-width: auto`, it took 817 px at a 360 px viewport.
    const token = 'X'.repeat(70)
    const html = serverHtml([makeBout(token)])
    render(
      <FightHistory bouts={[makeBout(token)]} opponentLinks={new Map([[token, 'long-name']])} />
    )

    for (const name of [
      html.querySelector('span.font-semibold'),
      screen.getByRole('link', { name: token })
    ]) {
      expect(name?.textContent).toBe(token)
      // Text in a block, not a flex item: it wraps in the column, which may shrink and breaks
      // long words.
      expect(name?.parentElement?.className).toBe('')
      expect(name?.parentElement?.parentElement?.className).toBe('min-w-0 flex-1 break-words')
    }
  })

  it('has no "Show more" for 10 bouts or fewer', () => {
    const html = serverHtml(opponents(10).map(name => makeBout(name)))

    expect(html.textContent).toContain('Opponent 10')
    expect(html.querySelector('details')).toBeNull()
  })

  it('renders nothing without bouts', () => {
    expect(renderToString(<FightHistory bouts={[]} opponentLinks={new Map()} />)).toBe('')
  })
})
