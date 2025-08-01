/**
 * Transform database boxer data to match frontend expectations
 * This maintains backward compatibility with existing components
 * Now that we're using camelCase in the database, we only need to add
 * the computed/aliased fields that the frontend expects
 */
import type { BoxerSelect } from '../database/validation/boxers'

export function transformBoxerForFrontend(dbBoxer: BoxerSelect) {
  return {
    ...dbBoxer,
    // Add computed/aliased fields the frontend expects
    fullName: dbBoxer.name, // Frontend expects fullName, DB has name
    image: dbBoxer.avatarImage,
    active: dbBoxer.proStatus === 'active',
    division: dbBoxer.proDivision,
    
    // Create record object from individual fields
    record: {
      wins: dbBoxer.proWins,
      losses: dbBoxer.proLosses,
      draws: dbBoxer.proDraws,
      knockouts: dbBoxer.proWinsByKnockout,
    },
    
    // Keep snake_case aliases for compatibility
    // These will be removed once frontend is updated
    image_url: dbBoxer.avatarImage,
    birth_date: dbBoxer.dateOfBirth,
    birth_place: dbBoxer.birthPlace,
    birth_name: dbBoxer.birthName,
    full_name: dbBoxer.name,
    boxrec_id: dbBoxer.boxrecId,
    boxrec_url: dbBoxer.boxrecUrl,
    boxrec_wiki_url: dbBoxer.boxrecWikiUrl,
    date_of_birth: dbBoxer.dateOfBirth,
    
    // Professional career snake_case aliases
    pro_wins: dbBoxer.proWins,
    pro_losses: dbBoxer.proLosses,
    pro_draws: dbBoxer.proDraws,
    pro_wins_by_knockout: dbBoxer.proWinsByKnockout,
    pro_losses_by_knockout: dbBoxer.proLossesByKnockout,
    pro_status: dbBoxer.proStatus,
    pro_division: dbBoxer.proDivision,
    pro_total_bouts: dbBoxer.proTotalBouts,
    pro_total_rounds: dbBoxer.proTotalRounds,
    pro_debut_date: dbBoxer.proDebutDate,
    
    // Amateur career snake_case aliases
    amateur_wins: dbBoxer.amateurWins,
    amateur_losses: dbBoxer.amateurLosses,
    amateur_draws: dbBoxer.amateurDraws,
    amateur_wins_by_knockout: dbBoxer.amateurWinsByKnockout,
    amateur_losses_by_knockout: dbBoxer.amateurLossesByKnockout,
    amateur_total_bouts: dbBoxer.amateurTotalBouts,
    amateur_total_rounds: dbBoxer.amateurTotalRounds,
    amateur_debut_date: dbBoxer.amateurDebutDate,
    amateur_division: dbBoxer.amateurDivision,
    amateur_status: dbBoxer.amateurStatus,
    
    // Other snake_case aliases
    created_at: dbBoxer.createdAt,
    updated_at: dbBoxer.updatedAt,
    
    // Add placeholder for missing complex fields
    bioSections: null,
    bouts: [], // Legacy format
    fights: [], // Will be populated separately from boxerBoutsTable
  }
}

export function transformBoxersForFrontend(dbBoxers: BoxerSelect[]) {
  return dbBoxers.map(transformBoxerForFrontend)
}