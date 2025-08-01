import type { Boxer } from './boxers'

export interface Division {
  id: string
  slug: string
  name: string
  shortName?: string | null
  alternativeNames?: string[] | null
  
  weightLimitPounds: number
  weightLimitKilograms: number
  weightLimitStone?: string
  
  createdAt: string
  updatedAt: string
}

export interface DivisionWithBoxers extends Division {
  topBoxers: Boxer[]
  totalBoxers: number
}