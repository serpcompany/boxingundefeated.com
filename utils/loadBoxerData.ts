import type { Boxer } from '~/types'
import boxersData from '~/data/boxers.json'
// Import mock data for development
import mockBoxersData from '~/data/boxers-mock.json'

// Use mock data for development - switch this to false to use real data
const USE_MOCK_DATA = true

export function loadBoxers(): Boxer[] {
  const data = USE_MOCK_DATA ? mockBoxersData : boxersData.boxers
  
  return data.map(boxer => {
    // Check if it's new format (has full_name) or old format (has name)
    const isNewFormat = 'full_name' in boxer
    
    if (isNewFormat) {
      return {
        ...boxer,
        // Add legacy fields for compatibility with existing components
        name: boxer.full_name,
        birthDate: boxer.date_of_birth,
        birthPlace: boxer.birth_place,
        birthName: boxer.birth_name,
        boxrecId: boxer.boxrec_id,
        boxrecUrl: boxer.boxrec_url,
        image: boxer.image_url,
        division: boxer.pro_division,
        active: boxer.pro_status === 'active',
        isChampion: false, // Would need to be determined from titles/rankings
        ranking: null, // Would need to be fetched from rankings table
        // Build record object for compatibility
        record: {
          wins: boxer.pro_wins,
          losses: boxer.pro_losses,
          draws: boxer.pro_draws,
          knockouts: boxer.pro_wins_by_knockout
        }
      }
    } else {
      // Old format - maintain existing compatibility mappings
      return {
        ...boxer,
        // Add computed/legacy fields for compatibility
        id: boxer.boxrec_id,
        birthDate: boxer.birth_date,
        birthPlace: boxer.birth_place,
        birthName: boxer.birth_name,
        boxrecId: boxer.boxrec_id,
        boxrecUrl: boxer.boxrec_url,
        manager: boxer.manager_agent,
        active: boxer.status === 'active' || !boxer.status,
        // Convert record.kos to record.knockouts for compatibility
        record: {
          ...boxer.record,
          knockouts: boxer.record.kos
        }
      }
    }
  })
}

export function findBoxerBySlug(slug: string): Boxer | null {
  const boxers = loadBoxers()
  return boxers.find(b => b.slug === slug) || null
}

export function findBoxersByDivision(division: string): Boxer[] {
  const boxers = loadBoxers()
  // Normalize the division slug to match the data format
  // Convert "super-featherweight" to "Super Featherweight"
  const normalizedDivision = division
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  
  return boxers.filter(b => {
    const boxerDivision = b.division || b.pro_division
    return boxerDivision === normalizedDivision || boxerDivision === division
  })
}