import type { Boxer } from './boxers'

export interface Division {
  id: string
  slug: string
  name: string
  alternativeNames?: string[]
  
  weightLimitPounds: number
  
  createdAt: string
  updatedAt: string
}

export interface DivisionWithBoxers extends Division {
  topBoxers: Boxer[]
  totalBoxers: number
}