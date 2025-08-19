import type { Boxer } from "~/server/db/drizzle";
import type { SelectItem } from "#ui/types"

interface BoxerRecordStat {
    name: string;
    value: string | number;
    color: string;
}

export function getBoxersNationalities(boxers: Boxer[]): SelectItem[] {
    let items = Array.from(new Set(boxers.map((boxer) => boxer.nationality).filter((v) => v != null)))

    const parsedItems: SelectItem[] = [
      { label: 'All Nationalities', value: 'all' },
      ...items.map((item) => ({ label: item, value: item })),
    ]

    return parsedItems
}

export function getBoxersDivisions(boxers: Boxer[]): SelectItem[] {
    let items = Array.from(new Set(boxers.map((boxer) => boxer.proDivision).filter((v) => v != null).filter((v) => v !== '')))

    const parsedItems: SelectItem[] = [
      { label: 'All Divisions', value: 'all' },
      ...items.map((item) => ({ label: item, value: item })),
    ]

    return parsedItems
}

export function formatBoxerStatus(status: string): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Retired';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

export function calculateKOPercent(wins: number, kos: number): string {
  if (wins === 0) return '0%';
  const koPercent = ((kos / wins) * 100).toFixed(1);
  return `${koPercent}%`;
}

export function calculateWinRate(wins: number, totalFights: number) {
    if (totalFights === 0) return 0;
    const winRate = ((wins / totalFights) * 100).toFixed(1);
    return `${winRate}%`
}

export function getBoxerStats(boxer: Boxer, type: "professional" | "amateur"): BoxerRecordStat[] {
    const wins = type === 'professional' ? boxer.proWins || 0 : boxer.amateurWins || 0;
    const losses = type === 'professional' ? boxer.proLosses || 0 : boxer.amateurLosses || 0;
    const draws = type === 'professional' ? boxer.proDraws || 0 : boxer.amateurDraws || 0;
    const kos = type === 'professional' ? boxer.proWinsByKnockout || 0 : boxer.amateurWinsByKnockout || 0;

    return [
        { name: 'Wins', value: wins, color: 'text-green-500' },
        { name: 'Losses', value: losses, color: 'text-red-600' },
        { name: 'Draws', value: draws, color: 'text-neutral' },
        { name: 'KO Rate', value: calculateKOPercent(wins, kos), color: 'text-highlighted' },
    ];
}

export function formatBoxerLink(name:string) {
    return `/boxers/${name.replace(/\s+/g, '-').toLowerCase()}`
}
