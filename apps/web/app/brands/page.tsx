import { Breadcrumb } from '@boxingundefeated/design-system/breadcrumb'
import { getBaseUrl } from '@boxingundefeated/utils/get-base-url'
import type { Metadata } from 'next'
import { getNoAdultBrands } from '@/lib/brands'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Brands',
    description: 'Browse related SERP brands and properties.',
    alternates: {
      canonical: `${getBaseUrl()}/brands/`
    }
  }
}

export default async function BrandsPage() {
  const brands = getNoAdultBrands()

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Breadcrumb items={[{ name: 'Brands', href: '/brands/' }]} baseUrl={getBaseUrl()} />
      <h1 className="mb-4 text-4xl font-bold tracking-tight">Brands</h1>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {brands.map(brand => (
          <li key={brand.key} className="rounded-md border p-4">
            <h2 className="mb-2 text-lg font-semibold">{brand.name}</h2>
            <a
              href={brand.url}
              target="_blank"
              rel="noopener noreferrer"
              className="break-words text-sm text-muted-foreground hover:text-foreground"
            >
              {brand.url}
            </a>
          </li>
        ))}
      </ul>
    </main>
  )
}
