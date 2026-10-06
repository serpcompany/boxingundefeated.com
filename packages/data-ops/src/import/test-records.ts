import type { SourceBout, SourceBoxer } from './source'

/** A valid source record with every field of `from-pipeline/boxers.json`. */
export function sourceBoxer(
  id: number,
  name: string,
  fields: Partial<SourceBoxer> = {}
): SourceBoxer {
  const boxrecId = String(id * 10)
  return {
    id,
    boxrecId,
    boxrecUrl: `https://boxrec.com/en/box-pro/${boxrecId}`,
    boxrecWikiUrl: null,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    birthName: null,
    nicknames: null,
    avatarImage: 'https://boxrec.com/images/v6-avatar.svg',
    residence: 'Leicester, United Kingdom',
    birthPlace: null,
    dateOfBirth: null,
    gender: 'M',
    nationality: 'United Kingdom',
    height: '170',
    reach: null,
    stance: 'orthodox',
    bio: '<p>Bio</p>',
    promoters: null,
    trainers: null,
    managers: null,
    gym: null,
    proDebutDate: '1990-01-01',
    proDivision: 'welter',
    proWins: 1,
    proWinsByKnockout: 0,
    proLosses: 0,
    proLossesByKnockout: 0,
    proDraws: 0,
    proStatus: 'inactive',
    proTotalBouts: 1,
    proTotalRounds: 4,
    amateurDebutDate: '',
    amateurDivision: '',
    amateurWins: null,
    amateurWinsByKnockout: null,
    amateurLosses: null,
    amateurLossesByKnockout: null,
    amateurDraws: null,
    amateurStatus: 'inactive',
    amateurTotalBouts: null,
    amateurTotalRounds: 4,
    bouts: [],
    createdAt: '2025-08-08T18:59:33.543567',
    updatedAt: '2025-08-08T18:59:33.543571',
    ...fields
  }
}

export function sourceBout(
  boxer: Pick<SourceBoxer, 'boxrecId'>,
  boutId: string,
  opponentName: string,
  fields: Partial<SourceBout> = {}
): SourceBout {
  return {
    boxerId: boxer.boxrecId,
    boxrecId: boutId,
    boutDate: 'Jan 90',
    opponentName,
    opponentWeight: null,
    opponentRecord: null,
    eventName: 'Granby Halls, Leicester',
    refereeName: null,
    judge1Name: null,
    judge1Score: null,
    judge2Name: null,
    judge2Score: null,
    judge3Name: null,
    judge3Score: null,
    numRoundsScheduled: null,
    result: 'win',
    resultMethod: null,
    resultRound: null,
    eventPageLink: null,
    boutPageLink: `https://boxrec.com/en/event/1/${boutId}`,
    scorecardsPageLink: null,
    titleFight: false,
    ...fields
  }
}

/** Two boxers who fought each other, so each bout links to the other's profile. */
export function opponentPair(): SourceBoxer[] {
  const ana = sourceBoxer(1, "Ana O'Brien Jr", { proDivision: '', proStatus: '' })
  const bea = sourceBoxer(2, 'Bea Brown', { managers: 'Ron Dove\nBob Kane' })
  ana.bouts = [
    sourceBout(ana, '900', 'Bea Brown'),
    sourceBout(ana, '901', 'Cy Nobody', { eventName: '', titleFight: true })
  ]
  bea.bouts = [sourceBout(bea, '900', "Ana O'Brien", { result: 'loss' })]
  return [ana, bea]
}
