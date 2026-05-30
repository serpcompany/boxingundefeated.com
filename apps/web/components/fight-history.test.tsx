import { render, screen, waitFor } from '@testing-library/react'
import type { Bout } from '@/lib/boxers-loader'
import { getOpponentLinksForBouts } from '@/lib/opponent-mapper'
import { FightHistory } from './fight-history'

function makeBout(opponentName: string): Bout {
  return {
    boxerId: 'boxer-1',
    boxrecId: `bout-${opponentName}`,
    boutDate: '2024-01-01',
    opponentName,
    eventName: 'Test Event',
    result: 'win',
    titleFight: false
  }
}

describe('FightHistory opponent links', () => {
  it('links known opponents using normalized name lookup and leaves unknown opponents unlinked', async () => {
    const bouts = [makeBout('William Lawrence Stribling'), makeBout('Unknown Opponent')]
    const opponentLinks = getOpponentLinksForBouts(bouts)

    render(<FightHistory bouts={bouts} opponentLinks={opponentLinks} />)

    await waitFor(() => expect(screen.getByText('William Lawrence Stribling')).toBeInTheDocument())

    expect(screen.getByRole('link', { name: 'William Lawrence Stribling' })).toHaveAttribute(
      'href',
      '/boxers/young-stribling'
    )
    expect(screen.queryByRole('link', { name: 'Unknown Opponent' })).not.toBeInTheDocument()
  })
})
