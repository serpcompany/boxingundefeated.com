import { Breadcrumb } from '@boxingundefeated/design-system/breadcrumb'
import type { Metadata } from 'next'
import { getBrands } from '@/lib/brands'
import { getSiteOrigin } from '@/lib/site-config'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Brands',
    description: 'Browse related SERP brands and properties.',
    alternates: {
      canonical: `${getSiteOrigin()}/brands/`
    }
  }
}

// The SERP brands page rules: one entry per brand, the brand name as the link
// text, its canonical URL as the href, alphabetical, a new tab and followed links.
// serpcompany/serp docs/marketing/brands-page.md
export default async function BrandsPage() {
  const brands = getBrands()

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Breadcrumb items={[{ name: 'Brands', href: '/brands/' }]} baseUrl={getSiteOrigin()} />
      <h1 className="mb-4 text-4xl font-bold tracking-tight">Brands</h1>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {brands.map(brand => (
          <li key={brand.slug} className="rounded-md border p-4">
            <h2 className="text-base font-semibold leading-6">
              <a href={brand.url} target="_blank" rel="noopener">
                {brand.name}
              </a>
            </h2>
          </li>
        ))}
      </ul>
    </div>
  )
}
