import { Breadcrumb } from '@boxingundefeated/design-system/breadcrumb'
import { getBaseUrl } from '@boxingundefeated/utils/get-base-url'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BoxersDirectoryList } from '@/components/boxers-directory-list'
import { getBoxersWithoutBouts } from '@/lib/boxers-loader'
import {
  getBoxersPageHref,
  getPaginatedItems,
  getPaginationPages,
  sortBoxersForDirectory
} from '@/lib/directory-pagination'

export const dynamicParams = false

export async function generateStaticParams() {
  const totalPages = getPaginationPages(getBoxersWithoutBouts().length)

  return totalPages.slice(1).map(page => ({
    page: page.toString()
  }))
}

export async function generateMetadata({
  params
}: {
  params: { page: string }
}): Promise<Metadata> {
  const { page: pageParam } = await params
  const page = Number.parseInt(pageParam, 10)
  const baseUrl = getBaseUrl()

  return {
    title: `Boxers Directory - Page ${page}`,
    description: `Browse page ${page} of our comprehensive directory of professional boxers.`,
    alternates: {
      canonical: `${baseUrl}${getBoxersPageHref(page)}`
    }
  }
}

export default async function BoxersPaginatedPage({ params }: { params: { page: string } }) {
  const { page: pageParam } = await params
  const currentPage = Number.parseInt(pageParam, 10)
  const boxers = sortBoxersForDirectory(getBoxersWithoutBouts())
  const page = getPaginatedItems(boxers, currentPage)

  if (!page || currentPage === 1) {
    notFound()
  }

  const baseUrl = getBaseUrl()
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
