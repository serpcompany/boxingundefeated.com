import type { BoxerBout } from './boxerBouts'

export interface Boxer {
  id: string
  boxrecId: string
  boxrecUrl: string
  slug: string
  
  fullName: string
  birthName?: string | null
  nickname?: string | null
  gender?: 'male' | 'female'
  
  avatarImage?: string
  
  residence?: string | null
  birthPlace?: string | null
  dateOfBirth?: string | null
  nationality?: string
  
  height?: string | null
  reach?: string | null
  weight?: string | null
  stance?: 'orthodox' | 'southpaw' | string
  
  bio?: string
  
  promoter?: string | null
  trainer?: string | null
  manager?: string | null
  gym?: string | null
  
  proDebutDate?: string | null
  proDivision?: string | null
  proWins: number
  proWinsByKnockout: number
  proLosses: number
  proLossesByKnockout: number
  proDraws: number
  proStatus?: 'active' | 'inactive' | string
  proTotalBouts: number
  proTotalRounds: number
  
  amateurDebutDate?: string | null
  amateurDivision?: string | null
  amateurWins: number
  amateurWinsByKnockout: number
  amateurLosses: number
  amateurLossesByKnockout: number
  amateurDraws: number
  amateurStatus?: 'active' | 'inactive' | string
  amateurTotalBouts: number
  amateurTotalRounds: number
  
  fights?: BoxerBout[]
  
  isChampion?: boolean
  ranking?: number | null
  
  createdAt?: string
  updatedAt?: string
}

export interface BoxerListResponse {
  boxers: Boxer[]
  total: number
  page: number
  perPage: number
}