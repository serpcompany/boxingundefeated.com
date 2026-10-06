import { Breadcrumb } from '@boxingundefeated/design-system/breadcrumb'
import { Card, CardContent, CardHeader, CardTitle } from '@boxingundefeated/design-system/card'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getBoxerCategories, getBoxersWithoutBouts } from '@/lib/boxers-loader'
import { getSiteOrigin } from '@/lib/site-config'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Boxing Divisions',
    description: 'Browse professional boxers by weight class.',
    alternates: {
      canonical: `${getSiteOrigin()}/divisions/`
    }
  }
}

export default async function DivisionsPage() {
  const baseUrl = getSiteOrigin()
  const categories = getBoxerCategories()
  const boxers = getBoxersWithoutBouts()

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Breadcrumb items={[{ name: 'Divisions', href: '/divisions/' }]} baseUrl={baseUrl} />
      <h1 className="mb-4 text-4xl font-bold tracking-tight">Divisions</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map(category => {
          const boxerCount = boxers.filter(boxer => boxer.proDivision === category.division).length

          return (
            <Card key={category.slug} className="transition-shadow hover:shadow-lg">
              <CardHeader>
                <CardTitle>
                  <Link href={`/divisions/${category.slug}/`} className="hover:underline">
                    {category.name}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {boxerCount.toLocaleString()} boxers
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </main>
  )
}
