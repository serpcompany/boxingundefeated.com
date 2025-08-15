import type { Boxer } from "~/server/db/drizzle";
import type { SelectItem } from "#ui/types"

export function getBoxersNationalities(boxers: Boxer[]): SelectItem[] {
    let items = Array.from(new Set(boxers.map((boxer) => boxer.nationality).filter((v) => v != null)))

    const parsedItems: SelectItem[] = [
      { label: 'All Nationalities', value: 'all' },
      ...items.map((item) => ({ label: item, value: item })),
    ]

    return parsedItems
}

export function getBoxersDivisions(boxers: Boxer[]): SelectItem[] {
    let items = Array.from(new Set(boxers.map((boxer) => boxer.proDivision).filter((v) => v != null)))

    const parsedItems: SelectItem[] = [
      { label: 'All Divisions', value: 'all' },
      ...items.map((item) => ({ label: item, value: item })),
    ]

    return parsedItems
}
