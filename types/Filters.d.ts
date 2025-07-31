// Helper types for filters and search
export interface BoxerFilters {
  search?: string
  divisions?: string[]
  division?: string
  nationality?: string
  status?: 'active' | 'retired' | 'deceased' | 'inactive'
  isChampion?: boolean
  stance?: string
  sortBy?: 'name' | 'record' | 'updated' | 'created' | 'wins' | 'knockouts' | 'ranking' | 'recent'
  active?: boolean
}

export interface BoutFilters {
  boxerId?: string
  division?: string
  titleFight?: boolean
  dateFrom?: string
  dateTo?: string
  venue?: string
}