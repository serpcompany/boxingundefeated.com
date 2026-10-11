import { describe, expect, it } from 'vitest'
import {
  BOXER_PAGE_SIZE,
  getBoxersPageHref,
  getDivisionPageHref,
  getPaginationPages,
  getTotalPages,
  parsePageNumber
} from './directory-pagination'

describe('directory pagination helpers', () => {
  // The full import's boxer count: 117 pages of 48.
  const boxers = Array.from({ length: 5570 }, (_, index) => index)

  it('uses 48 boxers per page and exposes 117 boxer directory pages', () => {
    expect(BOXER_PAGE_SIZE).toBe(48)
    expect(getTotalPages(boxers.length, BOXER_PAGE_SIZE)).toBe(117)
    expect(getTotalPages(0)).toBe(1)
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

  it('paginates a division by its boxer count', () => {
    expect(getPaginationPages(48)).toEqual([1])
    expect(getPaginationPages(49)).toEqual([1, 2])
    expect(getDivisionPageHref('light-fly', 1)).toBe('/divisions/light-fly/')
    expect(getDivisionPageHref('light-fly', 2)).toBe('/divisions/light-fly/page/2/')
  })
})
