import { getBoxerCategories, getBoxersWithoutBouts } from './boxers-loader'
import {
  BOXER_PAGE_SIZE,
  getBoxersPageHref,
  getDivisionPageHref,
  getPaginatedItems,
  getPaginationPages,
  getTotalPages,
  parsePageNumber
} from './directory-pagination'

describe('directory pagination helpers', () => {
  const boxers = getBoxersWithoutBouts()

  it('uses 48 boxers per page and exposes 117 boxer directory pages', () => {
    expect(BOXER_PAGE_SIZE).toBe(48)
    expect(getTotalPages(boxers.length, BOXER_PAGE_SIZE)).toBe(117)
  })

  it('maps boxer directory page numbers to canonical hrefs', () => {
    expect(getBoxersPageHref(1)).toBe('/boxers/')
    expect(getBoxersPageHref(2)).toBe('/boxers/page/2/')
    expect(getBoxersPageHref(117)).toBe('/boxers/page/117/')
  })

  it('reads a page number only from its one canonical spelling', () => {
    expect(parsePageNumber('1')).toBe(1)
    expect(parsePageNumber('117')).toBe(117)
    for (const segment of ['', '0', '02', '2abc', '1.5', '-1', '1e2', ' 2', '9999999']) {
      expect([segment, parsePageNumber(segment)]).toEqual([segment, null])
    }
  })

  it('returns null for invalid requested pages', () => {
    expect(getPaginatedItems(boxers, 0)).toBeNull()
    expect(getPaginatedItems(boxers, 118)).toBeNull()
  })

  it('computes division pagination from current boxer data', () => {
    const categories = getBoxerCategories()

    for (const category of categories) {
      const divisionBoxers = boxers.filter(boxer => boxer.proDivision === category.division)
      const expectedTotalPages = getTotalPages(divisionBoxers.length, BOXER_PAGE_SIZE)

      expect(getPaginationPages(divisionBoxers.length)).toHaveLength(expectedTotalPages)
      expect(getDivisionPageHref(category.slug, 1)).toBe(`/divisions/${category.slug}/`)

      if (expectedTotalPages > 1) {
        expect(getDivisionPageHref(category.slug, 2)).toBe(`/divisions/${category.slug}/page/2/`)
      }
    }
  })
})
