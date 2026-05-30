import { getBaseUrl } from '@boxingundefeated/utils/get-base-url'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getBlogSlugs } from '@/lib/blog-loader'
import { getBoxerCategories, getBoxersWithoutBouts } from '@/lib/boxers-loader'
import {
  getBoxersPageHref,
  getDivisionPageHref,
  getPaginationPages
} from '@/lib/directory-pagination'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'HTML Sitemap',
    description: 'Browse all crawlable pages on Boxing Undefeated.',
    alternates: {
      canonical: `${getBaseUrl()}/sitemap/`
    }
  }
}

export default async function HtmlSitemapPage() {
  const boxers = getBoxersWithoutBouts()
  const categories = getBoxerCategories()
  const blogSlugs = await getBlogSlugs()
  const boxerPages = getPaginationPages(boxers.length)

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-8 text-4xl font-bold tracking-tight">Sitemap</h1>

      <SitemapSection
        title="Main pages"
        links={[
          { href: '/', label: 'Home' },
          { href: '/about', label: 'About' },
          { href: '/search', label: 'Search' },
          { href: '/blog', label: 'Blog' },
          { href: '/privacy', label: 'Privacy Policy' },
          { href: '/terms', label: 'Terms of Service' },
          { href: '/sitemap/', label: 'Sitemap' }
        ]}
      />

      <SitemapSection
        title="Boxer directory pages"
        links={boxerPages.map(page => ({
          href: getBoxersPageHref(page),
          label: page === 1 ? 'Boxers' : `Boxers page ${page}`
        }))}
      />

      <SitemapSection
        title="Weight classes"
        links={categories.flatMap(category => {
          const divisionCount = boxers.filter(
            boxer => boxer.proDivision === category.division
          ).length
          return getPaginationPages(divisionCount).map(page => ({
            href: getDivisionPageHref(category.slug, page),
            label: page === 1 ? category.name : `${category.name} page ${page}`
          }))
        })}
      />

      <SitemapSection
        title="Individual boxers"
        links={boxers.map(boxer => ({
          href: `/boxers/${boxer.slug}`,
          label: boxer.name
        }))}
      />

      <SitemapSection
        title="Blog posts"
        links={blogSlugs.map(slug => ({
          href: slug,
          label: slug
        }))}
      />
    </main>
  )
}

function SitemapSection({
  title,
  links
}: {
  title: string
  links: Array<{ href: string; label: string }>
}) {
  const baseUrl = getBaseUrl()

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-2xl font-semibold">{title}</h2>
      <ul className="columns-1 gap-8 space-y-1 text-sm md:columns-2 lg:columns-3">
        {links.map(link => (
          <li key={`${title}-${link.href}`} className="break-inside-avoid">
            <Link href={link.href} className="text-muted-foreground hover:text-foreground">
              {link.label}
            </Link>
            <span className="sr-only"> {baseUrl + link.href}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
