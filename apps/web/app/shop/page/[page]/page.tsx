import { Breadcrumb } from '@boxingundefeated/design-system/breadcrumb'
import { getBaseUrl } from '@boxingundefeated/utils/get-base-url'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ShopPostList } from '@/components/shop-post-list'
import { getPaginatedItems, getPaginationPages } from '@/lib/directory-pagination'
import { getShopPageHref, getShopPosts, SHOP_PAGE_SIZE } from '@/lib/shop-loader'

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
  params: { page: string }
}): Promise<Metadata> {
  const page = Number.parseInt(params.page, 10)

  return {
    title: `Shop Guides - Page ${page}`,
    description: `Browse page ${page} of boxing, fitness, and training gear buying guides.`,
    alternates: {
      canonical: `${getBaseUrl()}${getShopPageHref(page)}`
    }
  }
}

export default async function ShopPaginatedPage({ params }: { params: { page: string } }) {
  const currentPage = Number.parseInt(params.page, 10)

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
          { name: 'Shop', href: '/shop' },
          { name: `Page ${currentPage}`, href: getShopPageHref(currentPage) }
        ]}
        baseUrl={getBaseUrl()}
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
