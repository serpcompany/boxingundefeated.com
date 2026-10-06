import type { NewDivision } from '../types'

/**
 * The 17 weight classes, in the display order of today's `getBoxerCategories()`
 * (`apps/web/lib/boxers-loader.ts`). `proDivision` is the value boxers carry in the source.
 */
const DIVISION_NAMES = [
  ['heavy', 'Heavyweight', 'heavy'],
  ['light-heavy', 'Light Heavyweight', 'light heavy'],
  ['cruiser', 'Cruiserweight', 'cruiser'],
  ['super-middle', 'Super Middleweight', 'super middle'],
  ['middle', 'Middleweight', 'middle'],
  ['super-welter', 'Super Welterweight', 'super welter'],
  ['welter', 'Welterweight', 'welter'],
  ['super-light', 'Super Lightweight', 'super light'],
  ['light', 'Lightweight', 'light'],
  ['super-feather', 'Super Featherweight', 'super feather'],
  ['feather', 'Featherweight', 'feather'],
  ['super-bantam', 'Super Bantamweight', 'super bantam'],
  ['bantam', 'Bantamweight', 'bantam'],
  ['super-fly', 'Super Flyweight', 'super fly'],
  ['fly', 'Flyweight', 'fly'],
  ['light-fly', 'Light Flyweight', 'light fly'],
  ['minimum', 'Minimumweight', 'minimum']
] as const

export const DIVISIONS: readonly Required<NewDivision>[] = DIVISION_NAMES.map(
  ([slug, name, proDivision], sortOrder) => ({ slug, name, proDivision, sortOrder })
)
