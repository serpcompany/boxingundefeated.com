// Bout details for a boxer's fight history
export interface BoxerBout {
  bout_date: string
  opponent_name: string
  opponent_weight: string
  opponent_record: string
  venue_name: string
  referee_name: string
  judge_1_name: string
  judge_1_score: string
  judge_2_name: string
  judge_2_score: string
  judge_3_name: string
  judge_3_score: string
  num_rounds_scheduled: number
  result: 'win' | 'loss' | 'draw' | 'no-contest'
  result_method: 'ko' | 'tko' | 'decision' | 'dq' | 'rtd'
  result_round: number
  event_page_link: string
  bout_page_link: string
  scorecards_page_link: string
  title_fight: boolean
}

export interface Boxer {
  // Core identification
  id: string
  boxrec_id: string
  boxrec_url: string
  boxrec_wiki_url?: string
  slug: string
  
  // Basic information
  full_name: string
  birth_name?: string | null
  nickname?: string | null
  gender?: 'male' | 'female'
  
  // Images and media
  image_url?: string
  
  // Location info
  residence?: string | null
  birth_place?: string | null
  date_of_birth?: string | null
  nationality?: string
  
  // Physical attributes
  height?: string | null  // e.g. "5′ 9″ / 175cm"
  reach?: string | null  // e.g. "69″ / 175cm"
  weight?: string | null
  stance?: 'orthodox' | 'southpaw' | 'switch' | string
  
  // Content
  bio?: string
  
  // Management
  promoter?: string | null
  trainer?: string | null
  manager?: string | null
  gym?: string | null
  
  // Professional career
  pro_debut_date?: string | null
  pro_division?: string | null
  pro_wins: number
  pro_wins_by_knockout: number
  pro_losses: number
  pro_losses_by_knockout: number
  pro_draws: number
  pro_status?: 'active' | 'retired' | string
  pro_total_bouts: number
  pro_total_rounds: number
  
  // Amateur career
  amateur_debut_date?: string | null
  amateur_division?: string | null
  amateur_wins: number
  amateur_wins_by_knockout: number
  amateur_losses: number
  amateur_losses_by_knockout: number
  amateur_draws: number
  amateur_status?: 'active' | 'retired' | string
  amateur_total_bouts: number
  amateur_total_rounds: number
  
  // Fight history
  fights?: BoxerBout[]
  
  // Timestamps
  created_at?: string
  updated_at?: string
  
  // Legacy/compatibility fields (mapped from new structure)
  name?: string  // Maps to full_name
  birthDate?: string  // Maps to date_of_birth
  birthPlace?: string  // Maps to birth_place
  birthName?: string  // Maps to birth_name
  boxrecId?: string  // Maps to boxrec_id
  boxrecUrl?: string  // Maps to boxrec_url
  image?: string  // Maps to image_url
  division?: string  // Maps to pro_division
  active?: boolean  // Maps from pro_status
  isChampion?: boolean
  ranking?: number | null
  record?: {
    wins: number
    losses: number
    draws: number
    knockouts: number
  }
}

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

export interface Bout {
  id: string
  
  // Fighters
  fighter1: {
    boxerId: string
    name: string
    record?: string  // Record at time of fight
    result: 'win' | 'loss' | 'draw' | 'no-contest'
  }
  fighter2: {
    boxerId: string
    name: string
    record?: string
    result: 'win' | 'loss' | 'draw' | 'no-contest'
  }
  
  // Fight details
  date: string
  location: string
  venue?: string
  city?: string
  country?: string
  
  // Division and titles
  division: string
  title?: string
  titleFight?: boolean
  titles?: string[]  // e.g. ["WBA Super", "IBF", "WBO"]
  
  // Result
  outcome: {
    method: 'decision' | 'ko' | 'tko' | 'dq' | 'rtd' | 'technical-decision' | 'no-contest' | 'draw'
    round?: number
    time?: string  // e.g. "2:47"
    details?: string
  }
  
  // Fight details
  rounds: number
  scheduledRounds: number
  
  // Officials
  referee?: string
  judges?: string[]
  
  // Event info
  broadcaster?: string
  attendance?: number
  
  // Media
  highlights?: string[]  // URLs to video highlights
  fullFightUrl?: string
  
  // Metadata
  boxrecUrl?: string
  createdAt: string
  updatedAt: string
}

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

// Response types for API
export interface BoxerListResponse {
  boxers: Boxer[]
  total: number
  page: number
  perPage: number
}

export interface DivisionWithBoxers extends Division {
  topBoxers: Boxer[]
  totalBoxers: number
}