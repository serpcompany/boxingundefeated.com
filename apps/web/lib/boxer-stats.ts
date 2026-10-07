import type { ListedBoxer } from './boxer-data'

/** A boxer's record and rates, as the profile and the boxer cards show them. */
export function getBoxerStats(
  boxer: Pick<
    ListedBoxer,
    'proWins' | 'proWinsByKnockout' | 'proLosses' | 'proDraws' | 'proTotalBouts'
  >
) {
  const winRate =
    boxer.proTotalBouts && boxer.proTotalBouts > 0
      ? (((boxer.proWins || 0) / boxer.proTotalBouts) * 100).toFixed(1)
      : 0

  const koRate =
    boxer.proWins && boxer.proWins > 0
      ? (((boxer.proWinsByKnockout || 0) / boxer.proWins) * 100).toFixed(1)
      : 0

  return {
    record: `${boxer.proWins || 0}-${boxer.proLosses || 0}-${boxer.proDraws || 0}`,
    winRate: `${winRate}%`,
    koRate: `${koRate}%`,
    totalBouts: boxer.proTotalBouts || 0
  }
}
