// A client component with no state, only so the page's RSC payload carries the bouts as data
// rather than as rendered rows, which the HTML already has. As a server component, the longest
// record (100 bouts, the pipeline's cap) would weigh 52 KB more: 177 KB of HTML instead of 125 KB.
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@boxingundefeated/design-system/card'
import Link from 'next/link'
import type { ProfileBout } from '@/lib/boxer-data/profile'
import { normalizeInternalPath } from '@/lib/url-utils'

/** Bouts shown before "Show more"; the rest are in the HTML too, in a closed `<details>`. */
const INITIAL_BOUTS = 10

interface FightHistoryProps {
  bouts: ProfileBout[]
  opponentLinks: Map<string, string>
}

/**
 * Every bout, in the first HTML, so crawlers that don't run JavaScript and the first paint get the
 * whole record, one list item per bout. The first `INITIAL_BOUTS` show; "Show more" is a native
 * `<details>` that reveals the rest, numbered on, without JavaScript. Nothing is rendered in an
 * effect, so hydration changes nothing and nothing shifts.
 */
export function FightHistory({ bouts, opponentLinks }: FightHistoryProps) {
  if (bouts.length === 0) return null

  const shown = bouts.slice(0, INITIAL_BOUTS)
  const more = bouts.slice(INITIAL_BOUTS)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fight History ({bouts.length} Bouts)</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {shown.map((bout, index) => (
            <BoutRow
              key={`${bout.boxrecId}-${index}`}
              bout={bout}
              opponentSlug={opponentLinks.get(bout.opponentName)}
            />
          ))}
        </ol>
        {more.length > 0 && (
          <details className="group">
            {/* Hidden once open: the list then reads as one, as before. */}
            <summary className="mx-auto mt-4 block w-fit cursor-pointer list-none text-sm font-medium text-link hover:text-link-hover group-open:hidden [&::-webkit-details-marker]:hidden">
              Show {more.length} more fights →
            </summary>
            <ol start={INITIAL_BOUTS + 1} className="space-y-3 border-t pt-3">
              {more.map((bout, index) => (
                <BoutRow
                  key={`${bout.boxrecId}-${index + INITIAL_BOUTS}`}
                  bout={bout}
                  opponentSlug={opponentLinks.get(bout.opponentName)}
                />
              ))}
            </ol>
          </details>
        )}
      </CardContent>
    </Card>
  )
}

function BoutRow({ bout, opponentSlug }: { bout: ProfileBout; opponentSlug: string | undefined }) {
  return (
    <li className="border-b pb-3 last:border-0">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {opponentSlug ? (
              <Link
                href={normalizeInternalPath(`/boxers/${opponentSlug}`)}
                className="font-semibold hover:text-link hover:underline transition-colors"
              >
                {bout.opponentName}
              </Link>
            ) : (
              <span className="font-semibold">{bout.opponentName}</span>
            )}
            {bout.titleFight && (
              <span className="text-xs bg-title-fight text-title-fight-foreground px-2 py-0.5 rounded">
                Title Fight
              </span>
            )}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {bout.boutDate} • {bout.eventName}
          </div>
        </div>
        <div className="text-right">
          <span
            className={`font-bold ${
              bout.result === 'win'
                ? 'text-win'
                : bout.result === 'loss'
                  ? 'text-loss'
                  : 'text-draw'
            }`}
          >
            {bout.result ? bout.result.toUpperCase() : 'N/A'}
          </span>
          {bout.resultMethod && (
            <div className="text-xs text-muted-foreground">
              {bout.resultMethod} {bout.resultRound && `R${bout.resultRound}`}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}
