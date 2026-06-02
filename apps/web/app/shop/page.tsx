import { Breadcrumb } from '@boxingundefeated/design-system/breadcrumb'
import { getBaseUrl } from '@boxingundefeated/utils/get-base-url'
import type { Metadata } from 'next'
import { ShopPostList } from '@/components/shop-post-list'
import { getPaginatedItems } from '@/lib/directory-pagination'
import { getShopPosts, SHOP_PAGE_SIZE } from '@/lib/shop-loader'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Shop Guides',
    description: 'Browse boxing, fitness, and training gear buying guides.',
    alternates: {
      canonical: `${getBaseUrl()}/shop/`
    }
  }
}

export default async function ShopPage() {
  const posts = await getShopPosts()
  const page = getPaginatedItems(posts, 1, SHOP_PAGE_SIZE)

  if (!page) {
    throw new Error('Failed to paginate shop posts')
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Breadcrumb items={[{ name: 'Shop', href: '/shop/' }]} baseUrl={getBaseUrl()} />
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
