import { Breadcrumb } from '@boxingundefeated/design-system/breadcrumb'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BoxersDirectoryList } from '@/components/boxers-directory-list'
import { divisionStaticParams, getDivisionPage } from '@/lib/boxer-data'
import { getDivisionPageHref } from '@/lib/directory-pagination'
import { getSiteOrigin } from '@/lib/site-config'

// The static export prerenders every division from the committed JSON. The Worker prerenders none:
// it renders each one on request from D1, and an unknown division is a 404 (lib/boxer-data).
export const generateStaticParams = divisionStaticParams

export async function generateMetadata({
  params
}: {
  params: Promise<{ division: string }>
}): Promise<Metadata> {
  const { division } = await params
  const page = await getDivisionPage(division, 1)

  if (!page) {
    return {
      title: 'Division Not Found'
    }
  }

  const { name } = page.division

  return {
    title: `${name} Boxers - Boxing Directory`,
    description: `Browse professional ${name.toLowerCase()} boxers with statistics and fight records.`,
    alternates: {
      canonical: `${getSiteOrigin()}${getDivisionPageHref(division, 1)}`
    }
  }
}

export default async function DivisionPage({ params }: { params: Promise<{ division: string }> }) {
  const { division } = await params
  const page = await getDivisionPage(division, 1)

  if (!page) {
    notFound()
  }

  const baseUrl = getSiteOrigin()
  const breadcrumbItems = [
    { name: 'Divisions', href: '/divisions/' },
    { name: page.division.name, href: getDivisionPageHref(division, 1) }
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumb items={breadcrumbItems} baseUrl={baseUrl} />
      <BoxersDirectoryList
        title={`${page.division.name} Boxers`}
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
