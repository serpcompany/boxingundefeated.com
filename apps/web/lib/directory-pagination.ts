import type { BoxerMetadata } from './boxers-loader'

export const BOXER_PAGE_SIZE = 48

export interface DirectoryPage<T> {
  items: T[]
  currentPage: number
  totalItems: number
  totalPages: number
  startIndex: number
  endIndex: number
}

export function getTotalPages(totalItems: number, pageSize = BOXER_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(totalItems / pageSize))
}

export function getPaginationPages(totalItems: number, pageSize = BOXER_PAGE_SIZE): number[] {
  const totalPages = getTotalPages(totalItems, pageSize)
  return Array.from({ length: totalPages }, (_, index) => index + 1)
}

export function getPaginatedItems<T>(
  items: T[],
  page: number,
  pageSize = BOXER_PAGE_SIZE
): DirectoryPage<T> | null {
  const totalPages = getTotalPages(items.length, pageSize)

  if (!Number.isInteger(page) || page < 1 || page > totalPages) {
    return null
  }

  const startIndex = (page - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, items.length)

  return {
    items: items.slice(startIndex, endIndex),
    currentPage: page,
    totalItems: items.length,
    totalPages,
    startIndex,
    endIndex
  }
}

export function getBoxersPageHref(page: number): string {
  return page <= 1 ? '/boxers/' : `/boxers/page/${page}/`
}

export function getDivisionPageHref(divisionSlug: string, page: number): string {
  return page <= 1 ? `/divisions/${divisionSlug}/` : `/divisions/${divisionSlug}/page/${page}/`
}

export function getVisiblePaginationPages(currentPage: number, totalPages: number): number[] {
  const pages = new Set<number>([1, currentPage, totalPages])

  for (let page = currentPage - 2; page <= currentPage + 2; page++) {
    if (page >= 1 && page <= totalPages) {
      pages.add(page)
    }
  }

  return Array.from(pages).sort((a, b) => a - b)
}

export function sortBoxersForDirectory(boxers: BoxerMetadata[]): BoxerMetadata[] {
  return [...boxers].sort((a, b) => {
    const winsDiff = (b.proWins || 0) - (a.proWins || 0)
    if (winsDiff !== 0) return winsDiff

    const boutsDiff = (b.proTotalBouts || 0) - (a.proTotalBouts || 0)
    if (boutsDiff !== 0) return boutsDiff

    return a.name.localeCompare(b.name)
  })
}
