import type { Boxer } from './Boxer'

export interface Division {
  id: string
  slug: string
  name: string
  alternativeNames?: string[]
  
  weightLimit: {
    pounds: number
    kilograms: number
    stone?: string  // e.g. "12st 7lbs"
  }
  
  description?: string
  order: number
  
  // Champion info
  currentChampions?: {
    organization: string  // WBA, WBC, IBF, WBO, etc.
    boxerId: string
    since: string
  }[]
  
  createdAt: string
  updatedAt: string
}

export interface DivisionWithBoxers extends Division {
  topBoxers: Boxer[]
  totalBoxers: number
}