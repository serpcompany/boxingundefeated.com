/**
 * BoxerBout represents an individual fight record from a specific boxer's perspective.
 * This matches the denormalized boxer_bouts table structure used for displaying 
 * fight history on boxer profile pages.
 */
export interface BoxerBout {
  id?: number
  boxerId: string
  
  boutDate: string
  opponentName: string
  opponentWeight?: string | null
  opponentRecord?: string | null
  venueName?: string | null
  refereeName?: string | null
  
  judge1Name?: string | null
  judge1Score?: string | null
  judge2Name?: string | null
  judge2Score?: string | null
  judge3Name?: string | null
  judge3Score?: string | null
  
  numRoundsScheduled?: number | null
  result: 'win' | 'loss' | 'draw' | 'no-contest'
  resultMethod?: 'ko' | 'tko' | 'decision' | 'dq' | 'rtd' | null
  resultRound?: number | null
  
  eventPageLink?: string | null
  boutPageLink?: string | null
  scorecardsPageLink?: string | null
  
  titleFight?: boolean
  
  createdAt?: string
}