export interface Boxer {
  // Core identification
  id: string
  slug: string
  boxrecId?: string
  wikidataQID?: string
  
  // Basic information
  name: string
  birthName?: string
  nickname?: string
  nicknames?: string[]
  alias?: string
  sex?: 'male' | 'female'
  
  // Images and media
  image?: string
  profilePictureUrl?: string
  boxrecImageUrl?: string
  cloudflareImageUrl?: string
  googleSearchImageUrl?: string
  vaSourcedImageUrl?: string
  
  // Birth and personal info
  birthDate?: string
  deathDate?: string
  age?: number
  birthPlace?: string
  nationality?: string
  residence?: string
  
  // Physical attributes
  height?: string  // e.g. "6′ 2″"
  heightMetric?: number  // in cm
  weight?: string  // e.g. "147 lbs"
  weightMetric?: number  // in kg
  reach?: string  // e.g. "72″"
  reachMetric?: number  // in cm
  apeIndex?: number  // reach minus height
  stance?: 'orthodox' | 'southpaw' | 'switch'
  
  // Career info
  division: string
  weightClass?: string
  status?: 'active' | 'retired' | 'deceased' | 'inactive'
  debut?: string
  
  // Record
  record: {
    wins: number
    losses: number
    draws: number
    noContests?: number
    knockouts: number
    lossesViaKO?: number
    totalFights?: number
    totalRounds?: number
    koPercentage?: number
  }
  
  // Titles and achievements
  titles?: string[]
  titleWins?: number
  titleDefenses?: number
  titleKnockouts?: number
  rating?: number
  ranking?: number
  
  // Management
  manager?: string
  promoter?: string
  
  // Content
  bio?: string
  excerpt?: string
  description?: string
  article?: string
  careerSummary?: string
  careerHighlights?: string
  professionalCareer?: string
  amateurCareer?: string
  personalLife?: string
  faq?: string
  
  // External links
  boxrecUrl?: string
  wikipediaUrl?: string
  wikidataUrl?: string
  martialbotUrl?: string
  
  // Social media
  socialLinks?: {
    twitter?: string
    instagram?: string
    facebook?: string
    youtube?: string
    website?: string
  }
  
  // Metadata
  isChampion?: boolean
  active: boolean
  createdAt: string
  updatedAt: string
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