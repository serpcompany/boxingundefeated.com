import { Breadcrumb } from '@boxingundefeated/design-system/breadcrumb'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createNotFoundMetadata, createPageMetadata } from '@/lib/metadata'
import { decodePagePath, encodePath, routeKeyPath } from '@/lib/routing/non-ascii-paths'
import { getShopPost, getShopSlugs } from '@/lib/shop-loader'
import { getSiteOrigin } from '@/lib/site-config'
import { normalizeInternalPath, toAbsoluteUrl } from '@/lib/url-utils'
import './article.css'

// Articles are read from markdown with `fs` at build time, which the Worker can't do at request
// time: every article is prerendered, and any other path is a 404.
export const dynamicParams = false

export async function generateStaticParams() {
  const slugs = new Set(await getShopSlugs())
  // An article whose path has non-ASCII letters is prerendered at its ASCII route key as well,
  // which is the one the Worker can serve (lib/routing/non-ascii-paths.ts).
  const paths = Array.from(slugs).flatMap(slug => {
    const routeKey = routeKeyPath(slug)
    return routeKey === slug ? [slug] : [slug, routeKey]
  })
  return paths.map(path => {
    // Remove leading/trailing slashes and split
    const cleanSlug = normalizeInternalPath(path).replace(/^\/+|\/+$/g, '')
    return {
      slug: cleanSlug.split('/')
    }
  })
}

/**
 * The article path the route's segments stand for. Next.js passes non-ASCII letters
 * percent-encoded, and a route key stands for its article.
 */
function pagePath(slug: string[]): string {
  return normalizeInternalPath(decodePagePath(`/${slug.join('/')}`))
}

async function getPostBySlug(slug: string) {
  return getShopPost(normalizeInternalPath(slug))
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string[] }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(pagePath(slug))

  if (!post) {
    return createNotFoundMetadata()
  }

  return createPageMetadata({
    title: post.title,
    description: post.description,
    canonical: toAbsoluteUrl(getSiteOrigin(), post.slug)
  })
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const post = await getPostBySlug(pagePath(slug))

  if (!post) {
    notFound()
  }

  const baseUrl = getSiteOrigin()
  // The crumbs after Home: the Breadcrumb adds Home itself.
  const breadcrumbItems = [
    { name: 'Shop', href: '/shop/' },
    { name: post.title, href: encodePath(post.slug) }
  ]

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb items={breadcrumbItems} baseUrl={baseUrl} />

      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-4">{post.title}</h1>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <time dateTime={post.date}>
            {new Date(post.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </time>
          {post.author && (
            <>
              <span>•</span>
              <span>by {post.author}</span>
            </>
          )}
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-6">
            {post.tags.map(tag => (
              <span key={tag} className="px-3 py-1 text-sm bg-secondary rounded-md">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {post.description && <p className="text-lg text-muted-foreground">{post.description}</p>}
      </header>

      {post.image && (
        <div className="mb-8">
          <img src={post.image} alt={post.title} className="w-full rounded-lg" />
        </div>
      )}

      <div className="article-content" dangerouslySetInnerHTML={{ __html: post.content || '' }} />

      <footer className="mt-12 pt-8 border-t">
        <Link href="/shop/" className="text-primary hover:underline">
          ← Back to Shop
        </Link>
      </footer>
    </article>
  )
}
