import { Card, CardContent, CardHeader, CardTitle } from '@boxingundefeated/design-system/card'
import Link from 'next/link'
import type { ListedBoxer } from '@/lib/boxer-data'
import { getBoxerStats } from '@/lib/boxers-loader'
import { getVisiblePaginationPages } from '@/lib/directory-pagination'
import { normalizeInternalPath } from '@/lib/url-utils'

interface BoxersDirectoryListProps {
  title: string
  boxers: ListedBoxer[]
  currentPage: number
  totalPages: number
  totalItems: number
  startIndex: number
  endIndex: number
  getPageHref: (page: number) => string
}

export function BoxersDirectoryList({
  title,
  boxers,
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  getPageHref
}: BoxersDirectoryListProps) {
  return (
    <div>
      <h1 className="text-4xl font-bold tracking-tight mb-4">{title}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {boxers.map(boxer => (
          <BoxerDirectoryCard key={boxer.id || boxer.slug} boxer={boxer} />
        ))}
      </div>

      {totalPages > 1 && (
        <nav
          className="flex flex-wrap items-center justify-center gap-2 mt-8"
          aria-label={`${title} pagination`}
        >
          {currentPage > 1 && (
            <Link
              className="rounded-md border px-3 py-2 text-sm"
              href={getPageHref(currentPage - 1)}
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
                  href={getPageHref(page)}
                >
                  {page}
                </Link>
              </span>
            )
          })}

          {currentPage < totalPages && (
            <Link
              className="rounded-md border px-3 py-2 text-sm"
              href={getPageHref(currentPage + 1)}
            >
              Next
            </Link>
          )}
        </nav>
      )}

      <p className="text-center text-sm text-muted-foreground mt-4">
        Showing {startIndex + 1}-{endIndex} of {totalItems} boxers
      </p>
    </div>
  )
}

function BoxerDirectoryCard({ boxer }: { boxer: ListedBoxer }) {
  const stats = getBoxerStats(boxer)

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start gap-4">
          {boxer.avatarImage && (
            <img
              src={boxer.avatarImage}
              alt={boxer.name}
              className="h-16 w-16 rounded-full object-cover"
              loading="lazy"
            />
          )}
          <CardTitle className="flex-1">
            <Link href={normalizeInternalPath(`/boxers/${boxer.slug}`)} className="hover:underline">
              {boxer.name}
            </Link>
            {boxer.nicknames && (
              <span className="block text-sm font-normal text-muted-foreground">
                "{boxer.nicknames}"
              </span>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Record:</span>
            <span className="font-semibold">{stats.record}</span>
          </div>
          {boxer.proDivision && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Division:</span>
              <span className="capitalize">{boxer.proDivision}</span>
            </div>
          )}
          {boxer.nationality && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Nationality:</span>
              <span>{boxer.nationality}</span>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2 border-t pt-2 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Win Rate</div>
              <div className="font-semibold">{stats.winRate}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">KO Rate</div>
              <div className="font-semibold">{stats.koRate}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Bouts</div>
              <div className="font-semibold">{stats.totalBouts}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
