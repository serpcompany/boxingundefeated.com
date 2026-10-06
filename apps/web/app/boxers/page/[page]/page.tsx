import { Breadcrumb } from '@boxingundefeated/design-system/breadcrumb'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BoxersDirectoryList } from '@/components/boxers-directory-list'
import { boxersPageStaticParams, getBoxersPage } from '@/lib/boxer-data'
import { getBoxersPageHref, parsePageNumber } from '@/lib/directory-pagination'
import { getSiteOrigin } from '@/lib/site-config'

// The static export prerenders every page from the committed JSON. The Worker prerenders none: it
// renders each page on request from D1, and a page out of range is a 404 (lib/boxer-data).
export const generateStaticParams = boxersPageStaticParams

/** The listing for `/boxers/page/<n>/`, or null for page 1 (that is `/boxers/`) or out of range. */
async function getListing(pageParam: string) {
  const page = parsePageNumber(pageParam)
  return page === null || page === 1 ? null : getBoxersPage(page)
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ page: string }>
}): Promise<Metadata> {
  const { page: pageParam } = await params
  const listing = await getListing(pageParam)

  if (!listing) {
    return {
      title: 'Page Not Found'
    }
  }

  const page = listing.currentPage
  const baseUrl = getSiteOrigin()

  return {
    title: `Boxers Directory - Page ${page}`,
    description: `Browse page ${page} of our comprehensive directory of professional boxers.`,
    alternates: {
      canonical: `${baseUrl}${getBoxersPageHref(page)}`
    }
  }
}

export default async function BoxersPaginatedPage({
  params
}: {
  params: Promise<{ page: string }>
}) {
  const { page: pageParam } = await params
  const page = await getListing(pageParam)

  if (!page) {
    notFound()
  }

  const currentPage = page.currentPage
  const baseUrl = getSiteOrigin()
  const breadcrumbItems = [
    { name: 'Boxers', href: '/boxers/' },
    { name: `Page ${currentPage}`, href: getBoxersPageHref(currentPage) }
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumb items={breadcrumbItems} baseUrl={baseUrl} />
      <BoxersDirectoryList
        title={`Boxers - Page ${currentPage}`}
        boxers={page.items}
        currentPage={page.currentPage}
        totalPages={page.totalPages}
        totalItems={page.totalItems}
        startIndex={page.startIndex}
        endIndex={page.endIndex}
        getPageHref={getBoxersPageHref}
      />
    </div>
  )
}
