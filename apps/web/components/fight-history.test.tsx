import { render, screen } from '@testing-library/react'
// The Node build: jsdom has no MessageChannel, which the browser build needs.
import { renderToString } from 'react-dom/server.node'
import type { ProfileBout } from '@/lib/boxer-data'
import { FightHistory } from './fight-history'

function makeBout(opponentName: string): ProfileBout {
  return {
    boxrecId: `bout-${opponentName}`,
    boutDate: '2024-01-01',
    opponentName,
    eventName: 'Test Event',
    result: 'win',
    titleFight: false
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
    const html = serverHtml(names.map(makeBout))

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
    const html = serverHtml(opponents(12).map(makeBout))
    const [shown, more] = [...html.querySelectorAll('ol')]

    expect(html.querySelectorAll('li')).toHaveLength(12)
    expect(shown?.querySelectorAll('li')).toHaveLength(10)
    expect(more?.closest('details')).not.toBeNull()
    expect(more?.getAttribute('start')).toBe('11')
    expect(more?.querySelectorAll('li')).toHaveLength(2)
  })

  it('has no "Show more" for 10 bouts or fewer', () => {
    const html = serverHtml(opponents(10).map(makeBout))

    expect(html.textContent).toContain('Opponent 10')
    expect(html.querySelector('details')).toBeNull()
  })

  it('renders nothing without bouts', () => {
    expect(renderToString(<FightHistory bouts={[]} opponentLinks={new Map()} />)).toBe('')
  })
})
