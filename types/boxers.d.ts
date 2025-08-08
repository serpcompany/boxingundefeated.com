import type { BoxerBout } from './boxerBouts'

export interface Boxer {
  id: number
  boxrecId: string
  boxrecUrl: string
  boxrecWikiUrl?: string | null
  slug: string
  
  name: string
  birthName?: string | null
  nicknames?: string | null
  
  avatarImage?: string | null
  
  residence?: string | null
  birthPlace?: string | null
  dateOfBirth?: string | null
  gender?: string | null
  nationality?: string | null
  
  height?: string | null
  reach?: string | null
  stance?: string | null
  
  bio?: string | null
  
  promoters?: string | null
  trainers?: string | null
  managers?: string | null
  gym?: string | null
  
  proDebutDate?: string | null
  proDivision?: string | null
  proWins: number
  proWinsByKnockout: number
  proLosses: number
  proLossesByKnockout: number
  proDraws: number
  proStatus?: string | null
  proTotalBouts?: number | null
  proTotalRounds?: number | null
  
  amateurDebutDate?: string | null
  amateurDivision?: string | null
  amateurWins?: number | null
  amateurWinsByKnockout?: number | null
  amateurLosses?: number | null
  amateurLossesByKnockout?: number | null
  amateurDraws?: number | null
  amateurStatus?: string | null
  amateurTotalBouts?: number | null
  amateurTotalRounds?: number | null
  
  createdAt: string
  updatedAt: string
  
  // Legacy fields - to be removed
  bio?: any
  weight?: string | null
  bouts?: BoxerBout[]
}

export interface BoxerListResponse {
  boxers: Boxer[]
  total: number
  page: number
  perPage: number
}