/**
 * Transform database boxer data to match frontend expectations
 * This maintains backward compatibility with existing components
 */
import type { BoxerSelect } from '../database/validation/boxers'

export function transformBoxerForFrontend(dbBoxer: BoxerSelect) {
  return {
    ...dbBoxer,
    // Map database fields to expected frontend fields
    name: dbBoxer.fullName,
    image: dbBoxer.avatarImage,
    image_url: dbBoxer.avatarImage,
    active: dbBoxer.proStatus === 'active',
    division: dbBoxer.proDivision,
    
    // Create record object from individual fields
    record: {
      wins: dbBoxer.proWins,
      losses: dbBoxer.proLosses,
      draws: dbBoxer.proDraws,
      knockouts: dbBoxer.proWinsByKnockout,
    },
    
    // Keep snake_case versions for compatibility - ALL FIELDS
    // Personal Info
    date_of_birth: dbBoxer.dateOfBirth,
    birth_date: dbBoxer.dateOfBirth, // alias
    birth_place: dbBoxer.birthPlace,
    birth_name: dbBoxer.birthName,
    full_name: dbBoxer.fullName,
    
    // BoxRec Info
    boxrec_id: dbBoxer.boxrecId,
    boxrec_url: dbBoxer.boxrecUrl,
    
    // Professional Career
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
    
    // Amateur Career
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
    
    // Champion/Ranking Info
    is_champion: dbBoxer.isChampion,
    
    // Timestamps
    created_at: dbBoxer.createdAt,
    updated_at: dbBoxer.updatedAt,
    
    // Add placeholder for missing complex fields
    bioSections: null, // This would need to be stored separately or generated
    bouts: [], // Legacy format - will be replaced by fights
    fights: [], // Will be populated separately from boxerBoutsTable
  }
}

export function transformBoxersForFrontend(dbBoxers: BoxerSelect[]) {
  return dbBoxers.map(transformBoxerForFrontend)
}