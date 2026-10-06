import type { BoxerProfile } from '@boxingundefeated/data-ops'

/**
 * What a boxer profile page renders, whichever source it comes from. The static export's JSON
 * records fit it as they are; D1 rows go through `fromD1Profile`.
 */
export interface ProfileBoxer {
  slug: string
  name: string
  birthName?: string | null
  nicknames?: string | null
  avatarImage?: string | null
  residence?: string | null
  birthPlace?: string | null
  dateOfBirth?: string | null
  nationality?: string | null
  height?: string | null
  reach?: string | null
  stance?: string | null
  /** Trusted HTML. */
  bio?: string | null
  /** Newline-separated names, as in the source. */
  promoters?: string | null
  trainers?: string | null
  managers?: string | null
  gym?: string | null
  proDebutDate?: string | null
  proDivision?: string | null
  proStatus?: string | null
  proWins?: number
  proWinsByKnockout?: number
  proLosses?: number
  proDraws?: number
  proTotalBouts?: number
  proTotalRounds?: number | null
}

/** The bout fields the fight history shows. */
export interface ProfileBout {
  boxrecId: string
  boutDate: string
  opponentName: string
  eventName?: string | null
  result: string
  resultMethod?: string | null
  resultRound?: string | null
  titleFight: boolean
}

export interface BoxerProfileView {
  boxer: ProfileBoxer
  /** In source order. */
  bouts: ProfileBout[]
  /** Opponent name to slug, for each opponent with a profile. */
  opponentLinks: Map<string, string>
}

/**
 * D1 keeps `promoters`, `trainers` and `managers` as a `string[]`, split from the source's
 * newline-separated text. Joining them again renders what the static pages render: the same text,
 * and nothing for `[]`.
 */
function joinNames(names: readonly string[] | null | undefined): string | null {
  return names && names.length > 0 ? names.join('\n') : null
}

/** The page's view of a D1 profile. Opponent links come from each bout's `opponentSlug`. */
export function fromD1Profile({ boxer, bouts }: BoxerProfile): BoxerProfileView {
  const opponentLinks = new Map<string, string>()
  for (const bout of bouts) {
    if (bout.opponentSlug && !opponentLinks.has(bout.opponentName)) {
      opponentLinks.set(bout.opponentName, bout.opponentSlug)
    }
  }

  return {
    boxer: {
      slug: boxer.slug,
      name: boxer.name,
      birthName: boxer.birthName,
      nicknames: boxer.nicknames,
      avatarImage: boxer.avatarImage,
      residence: boxer.residence,
      birthPlace: boxer.birthPlace,
      dateOfBirth: boxer.dateOfBirth,
      nationality: boxer.nationality,
      height: boxer.height,
      reach: boxer.reach,
      stance: boxer.stance,
      bio: boxer.bio,
      promoters: joinNames(boxer.promoters),
      trainers: joinNames(boxer.trainers),
      managers: joinNames(boxer.managers),
      gym: boxer.gym,
      proDebutDate: boxer.proDebutDate,
      proDivision: boxer.proDivision,
      proStatus: boxer.proStatus,
      proWins: boxer.proWins,
      proWinsByKnockout: boxer.proWinsByKnockout,
      proLosses: boxer.proLosses,
      proDraws: boxer.proDraws,
      proTotalBouts: boxer.proTotalBouts,
      proTotalRounds: boxer.proTotalRounds
    },
    bouts: bouts.map(bout => ({
      boxrecId: bout.boxrecId,
      boutDate: bout.boutDate,
      opponentName: bout.opponentName,
      eventName: bout.eventName,
      result: bout.result,
      resultMethod: bout.resultMethod,
      resultRound: bout.resultRound,
      titleFight: bout.titleFight
    })),
    opponentLinks
  }
}
