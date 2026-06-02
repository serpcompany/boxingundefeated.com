import { Breadcrumb } from '@boxingundefeated/design-system/breadcrumb'
import { getBaseUrl } from '@boxingundefeated/utils/get-base-url'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBlogPost, getBlogSlugs } from '@/lib/blog-loader'
import { createMetaDescription } from '@/lib/metadata'
import { getShopPost, getShopSlugs } from '@/lib/shop-loader'
import { normalizeInternalPath, toAbsoluteUrl } from '@/lib/url-utils'
import '../blog/blog.css'

export async function generateStaticParams() {
  const slugs = new Set([...(await getBlogSlugs()), ...(await getShopSlugs())])
  return Array.from(slugs).map(slug => {
    // Remove leading/trailing slashes and split
    const cleanSlug = normalizeInternalPath(slug).replace(/^\/+|\/+$/g, '')
    return {
      slug: cleanSlug.split('/')
    }
  })
}

async function getPostBySlug(slug: string) {
  const normalizedSlug = normalizeInternalPath(slug)

  if (normalizedSlug.startsWith('/shop/')) {
    return getShopPost(normalizedSlug)
  }

  return getBlogPost(normalizedSlug)
}

export async function generateMetadata({
  params
}: {
  params: { slug: string[] }
}): Promise<Metadata> {
  const slugPath = normalizeInternalPath(`/${params.slug.join('/')}`)
  const post = await getPostBySlug(slugPath)

  if (!post) {
    return {
      title: 'Page Not Found - Boxing Directory'
    }
  }

  return {
    title: `${post.title} - Boxing Directory`,
    description: createMetaDescription(post.description),
    alternates: {
      canonical: toAbsoluteUrl(getBaseUrl(), post.slug)
    }
  }
}

export default async function BlogPostPage({ params }: { params: { slug: string[] } }) {
  const slugPath = normalizeInternalPath(`/${params.slug.join('/')}`)
  const post = await getPostBySlug(slugPath)

  if (!post) {
    notFound()
  }

  const baseUrl = getBaseUrl()
  const isShopPost = post.slug.startsWith('/shop/')
  const breadcrumbItems = [
    { name: 'Home', href: '/' },
    isShopPost ? { name: 'Shop', href: '/shop/' } : { name: 'Blog', href: '/blog/' },
    { name: post.title, href: post.slug }
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

      <div className="blog-content" dangerouslySetInnerHTML={{ __html: post.content || '' }} />

      <footer className="mt-12 pt-8 border-t">
        <Link href={isShopPost ? '/shop/' : '/blog/'} className="text-primary hover:underline">
          ← Back to {isShopPost ? 'Shop' : 'Blog'}
        </Link>
      </footer>
    </article>
  )
}
