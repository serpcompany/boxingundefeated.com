import { Breadcrumb } from '@boxingundefeated/design-system/breadcrumb'
import type { Metadata } from 'next'
import { BoxersDirectoryList } from '@/components/boxers-directory-list'
import { getBoxersPage } from '@/lib/boxer-data'
import { getBoxersPageHref } from '@/lib/directory-pagination'
import { getSiteOrigin } from '@/lib/site-config'

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = getSiteOrigin()

  return {
    title: 'Boxers Directory',
    description: 'Browse our comprehensive directory of professional boxers.',
    alternates: {
      canonical: `${baseUrl}/boxers/`
    }
  }
}

export default async function BoxersPage() {
  const baseUrl = getSiteOrigin()
  const breadcrumbItems = [{ name: 'Boxers', href: '/boxers/' }]
  const page = await getBoxersPage(1)

  if (!page) {
    throw new Error('Failed to paginate boxers')
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumb items={breadcrumbItems} baseUrl={baseUrl} />
      <BoxersDirectoryList
        title="Boxers"
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
