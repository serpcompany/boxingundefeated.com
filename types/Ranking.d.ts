export interface Ranking {
  id: string
  organization: string  // BoxRec, The Ring, ESPN, etc.
  division: string
  date: string
  
  rankings: {
    position: number
    boxerId: string
    points?: number
    trend?: 'up' | 'down' | 'stable'
    previousPosition?: number
  }[]
  
  createdAt: string
  updatedAt: string
}