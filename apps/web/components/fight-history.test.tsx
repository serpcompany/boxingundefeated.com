import { render, screen, waitFor } from '@testing-library/react'
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

describe('FightHistory opponent links', () => {
  it('links opponents with a profile and leaves the others unlinked', async () => {
    const bouts = [makeBout('William Lawrence Stribling'), makeBout('Unknown Opponent')]
    // Opponent slugs come from D1 (bouts.opponent_boxer_id), matched by the importer.
    const opponentLinks = new Map([['William Lawrence Stribling', 'young-stribling']])

    render(<FightHistory bouts={bouts} opponentLinks={opponentLinks} />)

    await waitFor(() => expect(screen.getByText('William Lawrence Stribling')).toBeInTheDocument())

    expect(screen.getByRole('link', { name: 'William Lawrence Stribling' })).toHaveAttribute(
      'href',
      '/boxers/young-stribling/'
    )
    expect(screen.queryByRole('link', { name: 'Unknown Opponent' })).not.toBeInTheDocument()
  })
})
