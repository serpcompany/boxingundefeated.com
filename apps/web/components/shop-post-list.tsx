import Link from 'next/link'
import type { BlogPost } from '@/lib/blog-loader'
import { getVisiblePaginationPages } from '@/lib/directory-pagination'
import { getShopPageHref } from '@/lib/shop-loader'

interface ShopPostListProps {
  posts: BlogPost[]
  currentPage: number
  totalPages: number
  totalItems: number
  startIndex: number
  endIndex: number
}

export function ShopPostList({
  posts,
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex
}: ShopPostListProps) {
  return (
    <div>
      <h1 className="mb-4 text-4xl font-bold tracking-tight">Shop</h1>

      <div className="space-y-6">
        {posts.map(post => (
          <article key={post.slug} className="border-b pb-6 last:border-0">
            <div className="grid gap-4 md:grid-cols-[180px_1fr]">
              {post.image && (
                <Link href={post.slug} className="block overflow-hidden rounded-md border">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="aspect-[16/10] h-full w-full object-cover"
                    loading="lazy"
                  />
                </Link>
              )}
              <div>
                <h2 className="mb-2 text-2xl font-semibold">
                  <Link href={post.slug} className="hover:underline">
                    {post.title}
                  </Link>
                </h2>
                <time className="text-sm text-muted-foreground" dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </time>
                {post.description && (
                  <p className="mt-3 text-muted-foreground">{post.description}</p>
                )}
                {post.tags && post.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {post.tags.map(tag => (
                      <span
                        key={`${post.slug}-${tag}`}
                        className="rounded-md bg-secondary px-2 py-1 text-xs"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <Link
                  className="mt-4 inline-block text-sm font-medium hover:underline"
                  href={post.slug}
                >
                  Read guide
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      {totalPages > 1 && (
        <nav
          className="mt-8 flex flex-wrap items-center justify-center gap-2"
          aria-label="Shop pagination"
        >
          {currentPage > 1 && (
            <Link
              className="rounded-md border px-3 py-2 text-sm"
              href={getShopPageHref(currentPage - 1)}
            >
              Previous
            </Link>
          )}

          {getVisiblePaginationPages(currentPage, totalPages).map((page, index, pages) => {
            const previousPage = pages[index - 1]
            const showGap = previousPage && page - previousPage > 1

            return (
              <span key={page} className="flex items-center gap-2">
                {showGap && <span className="text-sm text-muted-foreground">...</span>}
                <Link
                  aria-current={page === currentPage ? 'page' : undefined}
                  className={
                    page === currentPage
                      ? 'rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground'
                      : 'rounded-md border px-3 py-2 text-sm'
                  }
                  href={getShopPageHref(page)}
                >
                  {page}
                </Link>
              </span>
            )
          })}

          {currentPage < totalPages && (
            <Link
              className="rounded-md border px-3 py-2 text-sm"
              href={getShopPageHref(currentPage + 1)}
            >
              Next
            </Link>
          )}
        </nav>
      )}

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Showing {startIndex + 1}-{endIndex} of {totalItems} guides
      </p>
    </div>
  )
}
