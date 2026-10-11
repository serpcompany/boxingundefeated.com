import { Button } from '@boxingundefeated/design-system/button'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createNotFoundMetadata } from '@/lib/metadata'
import { getRoute } from '@/lib/routes'

// The title of every 404's first HTML: an unmatched URL, and a page that calls `notFound()`, whose
// body the Worker replaces with this page's (lib/worker/not-found-page.ts).
export const metadata: Metadata = createNotFoundMetadata()

export default async function NotFound() {
  return (
    <div className="mx-auto relative container flex flex-col items-center justify-center px-4">
      <div className="mx-auto flex h-screen flex-col items-center justify-center">
        <div className="flex h-full flex-col items-center justify-center">
          <span className="not-found rounded-md px-3.5 py-1 text-sm font-medium text-foreground">
            404
          </span>
          <h1 className="mt-5 text-3xl font-bold text-foreground md:text-5xl">Page Not Found</h1>
          <p className="mx-auto mt-5 max-w-xl text-center text-base  text-muted-foreground">
            The page you are looking for does not exist. <br /> But don&apos;t worry, we&apos;ve got
            you covered. You can{' '}
            <Link
              href="https://github.com/serpcompany/boxingundefeated.com/issues/new/choose"
              className="text-foreground"
            >
              report an issue on GitHub
            </Link>
            .
          </p>
          <Button asChild className="mt-8">
            <Link href={getRoute('home')}>Back to homepage</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
