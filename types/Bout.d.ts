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