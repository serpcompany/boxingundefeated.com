import type { Metadata } from 'next'
import Link from 'next/link'
import { getDirectoryCounts } from '@/lib/boxer-data'
import {
  getBoxersPageHref,
  getDivisionPageHref,
  getPaginationPages
} from '@/lib/directory-pagination'
import { createPageMetadata } from '@/lib/metadata'
import { getSiteOrigin, SITE_NAME } from '@/lib/site-config'
import { SITEMAP_GROUPS, SITEMAP_INDEX_PATH, sitemapFilePath } from '@/lib/sitemaps/sitemaps'

const SITEMAP_LABELS = {
  pages: 'Pages sitemap',
  boxers: 'Boxers sitemap',
  divisions: 'Divisions sitemap'
} as const

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: 'HTML Sitemap',
    description: `Browse all crawlable pages on ${SITE_NAME}.`,
    canonical: `${getSiteOrigin()}/sitemap/`
  })
}

export default async function HtmlSitemapPage() {
  const { totalBoxers, divisions } = await getDirectoryCounts()
  const boxerPages = getPaginationPages(totalBoxers)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-8 text-4xl font-bold tracking-tight">Sitemap</h1>

      <SitemapSection
        title="Main pages"
        links={[
          { href: '/', label: 'Home' },
          { href: '/about/', label: 'About' },
          { href: '/search/', label: 'Search' },
          { href: '/divisions/', label: 'Divisions' },
          { href: '/privacy/', label: 'Privacy Policy' },
          { href: '/terms/', label: 'Terms of Service' },
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
        links={divisions.flatMap(division =>
          getPaginationPages(division.boxerCount).map(page => ({
            href: getDivisionPageHref(division.slug, page),
            label: page === 1 ? division.name : `${division.name} page ${page}`
          }))
        )}
      />

      <SitemapSection
        title="XML sitemaps"
        links={[
          { href: SITEMAP_INDEX_PATH, label: 'Sitemap index' },
          ...SITEMAP_GROUPS.map(group => ({
            href: sitemapFilePath(group, 1),
            label: SITEMAP_LABELS[group]
          }))
        ]}
      />
    </div>
  )
}

function SitemapSection({
  title,
  links
}: {
  title: string
  links: Array<{ href: string; label: string }>
}) {
  const baseUrl = getSiteOrigin()

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
