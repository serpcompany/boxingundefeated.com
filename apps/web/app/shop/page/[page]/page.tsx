import { Breadcrumb } from '@boxingundefeated/design-system/breadcrumb'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ShopPostList } from '@/components/shop-post-list'
import { getPaginatedItems, getPaginationPages } from '@/lib/directory-pagination'
import { getShopPageHref, getShopPosts, SHOP_PAGE_SIZE } from '@/lib/shop-loader'
import { getSiteOrigin } from '@/lib/site-config'

export const dynamicParams = false

export async function generateStaticParams() {
  const posts = await getShopPosts()

  return getPaginationPages(posts.length, SHOP_PAGE_SIZE)
    .slice(1)
    .map(page => ({
      page: page.toString()
    }))
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ page: string }>
}): Promise<Metadata> {
  const { page: pageParam } = await params
  const page = Number.parseInt(pageParam, 10)

  return {
    title: `Shop Guides - Page ${page}`,
    description: `Browse page ${page} of boxing, fitness, and training gear buying guides.`,
    alternates: {
      canonical: `${getSiteOrigin()}${getShopPageHref(page)}`
    }
  }
}

export default async function ShopPaginatedPage({ params }: { params: Promise<{ page: string }> }) {
  const { page: pageParam } = await params
  const currentPage = Number.parseInt(pageParam, 10)

  if (currentPage === 1) {
    notFound()
  }

  const posts = await getShopPosts()
  const page = getPaginatedItems(posts, currentPage, SHOP_PAGE_SIZE)

  if (!page) {
    notFound()
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Breadcrumb
        items={[
          { name: 'Shop', href: '/shop/' },
          { name: `Page ${currentPage}`, href: getShopPageHref(currentPage) }
        ]}
        baseUrl={getSiteOrigin()}
      />
      <ShopPostList
        posts={page.items}
        currentPage={page.currentPage}
        totalPages={page.totalPages}
        totalItems={page.totalItems}
        startIndex={page.startIndex}
        endIndex={page.endIndex}
      />
    </main>
  )
}
