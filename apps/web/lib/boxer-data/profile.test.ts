/**
 * @jest-environment node
 */
import type { BoutWithOpponent, Boxer } from '@boxingundefeated/data-ops'
import { fromD1Profile } from './profile'

const boxer = {
  slug: 'jesse-hart',
  name: 'Jesse Hart',
  nicknames: null,
  promoters: [],
  trainers: ['Ron Dove'],
  managers: ['Ron Dove', 'Bob Kane']
} as unknown as Boxer

function bout(opponentName: string, opponentSlug: string | null): BoutWithOpponent {
  return {
    id: 7,
    boxerId: 1,
    boxrecId: '3122065',
    boutDate: 'Apr 24',
    opponentName,
    opponentBoxerId: opponentSlug ? 2 : null,
    opponentSlug,
    eventName: null,
    result: 'win',
    resultMethod: 'KO',
    resultRound: '3',
    titleFight: true,
    refereeName: 'Referee',
    boutPageLink: 'https://boxrec.com/en/event/884749/3122065'
  } as BoutWithOpponent
}

describe('fromD1Profile', () => {
  it('joins staff lists back into newline-separated text, and leaves [] and null out', () => {
    const { boxer: view } = fromD1Profile({ boxer, bouts: [] })

    expect(view.promoters).toBeNull()
    expect(view.trainers).toBe('Ron Dove')
    expect(view.managers).toBe('Ron Dove\nBob Kane')
    expect(view.nicknames).toBeNull()
  })

  it('links each opponent name that has a profile', () => {
    const { opponentLinks } = fromD1Profile({
      boxer,
      bouts: [bout('Daniel Aduku', 'daniel-aduku'), bout('Nobody', null)]
    })

    expect([...opponentLinks]).toEqual([['Daniel Aduku', 'daniel-aduku']])
  })

  it('sends the client only the bout fields the fight history shows', () => {
    const { bouts } = fromD1Profile({ boxer, bouts: [bout('Daniel Aduku', 'daniel-aduku')] })

    expect(bouts).toEqual([
      {
        boxrecId: '3122065',
        boutDate: 'Apr 24',
        opponentName: 'Daniel Aduku',
        eventName: null,
        result: 'win',
        resultMethod: 'KO',
        resultRound: '3',
        titleFight: true
      }
    ])
  })
})
