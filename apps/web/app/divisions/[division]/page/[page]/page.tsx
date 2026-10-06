import { Breadcrumb } from '@boxingundefeated/design-system/breadcrumb'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BoxersDirectoryList } from '@/components/boxers-directory-list'
import { getBoxerCategories, getBoxersWithoutBouts } from '@/lib/boxers-loader'
import {
  getDivisionPageHref,
  getPaginatedItems,
  getPaginationPages,
  sortBoxersForDirectory
} from '@/lib/directory-pagination'
import { getSiteOrigin } from '@/lib/site-config'

export const dynamicParams = false

export async function generateStaticParams() {
  const boxers = getBoxersWithoutBouts()

  return getBoxerCategories().flatMap(category => {
    const divisionBoxers = boxers.filter(boxer => boxer.proDivision === category.division)
    const pages = getPaginationPages(divisionBoxers.length)

    return pages.slice(1).map(page => ({
      division: category.slug,
      page: page.toString()
    }))
  })
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ division: string; page: string }>
}): Promise<Metadata> {
  const { division, page: pageParam } = await params
  const page = Number.parseInt(pageParam, 10)
  const category = getBoxerCategories().find(c => c.slug === division)

  if (!category) {
    return {
      title: 'Division Not Found'
    }
  }

  return {
    title: `${category.name} Boxers - Page ${page}`,
    description: `Browse page ${page} of professional ${category.name.toLowerCase()} boxers.`,
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
  const currentPage = Number.parseInt(pageParam, 10)
  const category = getBoxerCategories().find(c => c.slug === division)

  if (!category || currentPage === 1) {
    notFound()
  }

  const divisionBoxers = sortBoxersForDirectory(
    getBoxersWithoutBouts().filter(boxer => boxer.proDivision === category.division)
  )
  const page = getPaginatedItems(divisionBoxers, currentPage)

  if (!page) {
    notFound()
  }

  const baseUrl = getSiteOrigin()
  const breadcrumbItems = [
    { name: 'Divisions', href: '/divisions/' },
    { name: category.name, href: getDivisionPageHref(division, 1) },
    { name: `Page ${currentPage}`, href: getDivisionPageHref(division, currentPage) }
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumb items={breadcrumbItems} baseUrl={baseUrl} />
      <BoxersDirectoryList
        title={`${category.name} Boxers - Page ${currentPage}`}
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
