export interface Title {
  id: string
  organization: 'WBA' | 'WBC' | 'IBF' | 'WBO' | 'The Ring' | 'IBO' | 'WBU' | 'Other'
  division: string
  variant?: 'Super' | 'Regular' | 'Interim' | 'Silver' | 'Gold'
  
  currentChampion?: {
    boxerId: string
    since: string
    defenses: number
  }
  
  lineage?: {
    boxerId: string
    from: string
    to?: string
    defenses: number
    vacated?: boolean
    stripped?: boolean
  }[]
  
  createdAt: string
  updatedAt: string
}