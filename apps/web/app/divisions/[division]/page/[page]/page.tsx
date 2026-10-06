import { Breadcrumb } from '@boxingundefeated/design-system/breadcrumb'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BoxersDirectoryList } from '@/components/boxers-directory-list'
import { divisionPageStaticParams, getDivisionPage } from '@/lib/boxer-data'
import { getDivisionPageHref, parsePageNumber } from '@/lib/directory-pagination'
import { getSiteOrigin } from '@/lib/site-config'

// The static export prerenders every page from the committed JSON. The Worker prerenders none: it
// renders each page on request from D1, and an unknown division or a page out of range is a 404
// (lib/boxer-data).
export const generateStaticParams = divisionPageStaticParams

/**
 * The listing for `/divisions/<division>/page/<n>/`, or null for page 1 (that is
 * `/divisions/<division>/`), a page out of range or an unknown division.
 */
async function getListing(division: string, pageParam: string) {
  const page = parsePageNumber(pageParam)
  return page === null || page === 1 ? null : getDivisionPage(division, page)
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ division: string; page: string }>
}): Promise<Metadata> {
  const { division, page: pageParam } = await params
  const listing = await getListing(division, pageParam)

  if (!listing) {
    return {
      title: 'Division Not Found'
    }
  }

  const page = listing.currentPage
  const { name } = listing.division

  return {
    title: `${name} Boxers - Page ${page}`,
    description: `Browse page ${page} of professional ${name.toLowerCase()} boxers.`,
    alternates: {
      canonical: `${getSiteOrigin()}${getDivisionPageHref(division, page)}`
    }
  }
}

export default async function DivisionPaginatedPage({
  params
}: {
  params: Promise<{ division: string; page: string }>
}) {
  const { division, page: pageParam } = await params
  const page = await getListing(division, pageParam)

  if (!page) {
    notFound()
  }

  const currentPage = page.currentPage
  const { name } = page.division
  const baseUrl = getSiteOrigin()
  const breadcrumbItems = [
    { name: 'Divisions', href: '/divisions/' },
    { name, href: getDivisionPageHref(division, 1) },
    { name: `Page ${currentPage}`, href: getDivisionPageHref(division, currentPage) }
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumb items={breadcrumbItems} baseUrl={baseUrl} />
      <BoxersDirectoryList
        title={`${name} Boxers - Page ${currentPage}`}
        boxers={page.items}
        currentPage={page.currentPage}
        totalPages={page.totalPages}
        totalItems={page.totalItems}
        startIndex={page.startIndex}
        endIndex={page.endIndex}
        getPageHref={pageNumber => getDivisionPageHref(division, pageNumber)}
      />
    </div>
  )
}
