import {
  type BoxerListItem,
  type BoxerPage,
  boxerPhoto,
  type DirectoryCounts as D1DirectoryCounts,
  type DivisionBoxerPage,
  type DivisionWithCount,
  type HomepageData
} from '@boxingundefeated/data-ops'
import type { DirectoryPage } from '../directory-pagination'

/** What the listing pages render: D1 rows go through the `fromD1*` functions below. */

/** A boxer card: `/boxers/`, a division, the homepage's top fighters. */
export interface ListedBoxer {
  id?: number | string
  slug: string
  name: string
  nicknames?: string | null
  /**
   * The boxer's photo: the copy on this site (`/photos/<sha256>.<ext>`), the boxrec.com source
   * until the copy reaches it, or null for the placeholder (`boxerPhoto`).
   */
  photo?: string | null
  nationality?: string | null
  proDivision?: string | null
  proWins?: number
  proWinsByKnockout?: number
  proLosses?: number
  proDraws?: number
  proTotalBouts?: number
}

/** One page of `/boxers/` or of a division, 48 boxers per page in directory order. */
export type BoxerListingPage = DirectoryPage<ListedBoxer>

export interface DivisionSummary {
  slug: string
  name: string
  boxerCount: number
}

export interface DivisionListingPage extends BoxerListingPage {
  division: { slug: string; name: string }
}

export interface HomepageView {
  totalBoxers: number
  /** Boxers whose status is not `inactive`, including those with no status. */
  activeBoxers: number
  totalBouts: number
  /** More than 30 wins and fewer than 5 losses. */
  eliteBoxers: number
  /** The six with the most wins. */
  featuredBoxers: ListedBoxer[]
  /** Every division, in display order. */
  divisions: DivisionSummary[]
}

/** What sets the pagination of `/boxers/` and each division (the HTML sitemap). */
export interface DirectoryCounts {
  totalBoxers: number
  divisions: DivisionSummary[]
}

function fromD1Division({ slug, name, boxerCount }: DivisionWithCount): DivisionSummary {
  return { slug, name, boxerCount }
}

export function fromD1Divisions(divisions: DivisionWithCount[]): DivisionSummary[] {
  return divisions.map(fromD1Division)
}

/**
 * A D1 card. Its photo is the copy in R2 that the Worker serves (lib/worker/photos.ts), or until
 * the copy reaches the boxer, the boxrec.com source; BoxRec's placeholder becomes the site's.
 */
export function fromD1ListedBoxer({ photoKey, avatarImage, ...boxer }: BoxerListItem): ListedBoxer {
  return { ...boxer, photo: boxerPhoto(photoKey, avatarImage) }
}

export function fromD1Page({
  items,
  page,
  pageSize,
  totalItems,
  totalPages
}: BoxerPage): BoxerListingPage {
  const startIndex = (page - 1) * pageSize
  return {
    items: items.map(fromD1ListedBoxer),
    currentPage: page,
    totalItems,
    totalPages,
    startIndex,
    endIndex: startIndex + items.length
  }
}

export function fromD1DivisionPage(page: DivisionBoxerPage): DivisionListingPage {
  const { slug, name } = page.division
  return { ...fromD1Page(page), division: { slug, name } }
}

export function fromD1Homepage({ stats, featuredBoxers, divisions }: HomepageData): HomepageView {
  return {
    ...stats,
    featuredBoxers: featuredBoxers.map(fromD1ListedBoxer),
    divisions: fromD1Divisions(divisions)
  }
}

export function fromD1DirectoryCounts({
  totalBoxers,
  divisions
}: D1DirectoryCounts): DirectoryCounts {
  return { totalBoxers, divisions: fromD1Divisions(divisions) }
}
