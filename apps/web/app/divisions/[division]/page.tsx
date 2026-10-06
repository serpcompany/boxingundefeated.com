import { Breadcrumb } from '@boxingundefeated/design-system/breadcrumb'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BoxersDirectoryList } from '@/components/boxers-directory-list'
import { getBoxerCategories, getBoxersWithoutBouts } from '@/lib/boxers-loader'
import {
  getDivisionPageHref,
  getPaginatedItems,
  sortBoxersForDirectory
} from '@/lib/directory-pagination'
import { getSiteOrigin } from '@/lib/site-config'

export const dynamicParams = false

export async function generateStaticParams() {
  const categories = getBoxerCategories()
  return categories.map(category => ({
    division: category.slug
  }))
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ division: string }>
}): Promise<Metadata> {
  const { division } = await params
  const categories = getBoxerCategories()
  const category = categories.find(c => c.slug === division)

  if (!category) {
    return {
      title: 'Division Not Found'
    }
  }

  return {
    title: `${category.name} Boxers - Boxing Directory`,
    description: `Browse professional ${category.name.toLowerCase()} boxers with statistics and fight records.`,
    alternates: {
      canonical: `${getSiteOrigin()}${getDivisionPageHref(division, 1)}`
    }
  }
}

export default async function DivisionPage({ params }: { params: Promise<{ division: string }> }) {
  const { division } = await params
  const categories = getBoxerCategories()
  const category = categories.find(c => c.slug === division)

  if (!category) {
    notFound()
  }

  const divisionBoxers = sortBoxersForDirectory(
    getBoxersWithoutBouts().filter(boxer => boxer.proDivision === category.division)
  )
  const page = getPaginatedItems(divisionBoxers, 1)

  if (!page) {
    notFound()
  }

  const baseUrl = getSiteOrigin()
  const breadcrumbItems = [
    { name: 'Divisions', href: '/divisions/' },
    { name: category.name, href: getDivisionPageHref(division, 1) }
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumb items={breadcrumbItems} baseUrl={baseUrl} />
      <BoxersDirectoryList
        title={`${category.name} Boxers`}
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
