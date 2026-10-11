// A client component with no state, only so the page's RSC payload carries the bouts as data
// rather than as rendered rows, which the HTML already has. As a server component, the longest
// record (100 bouts, the pipeline's cap) would weigh 52 KB more: 177 KB of HTML instead of 125 KB.
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@boxingundefeated/design-system/card'
import Link from 'next/link'
import { plural } from '@/lib/boxer-data/display'
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
        <CardTitle>
          Fight History ({bouts.length} {plural(bouts.length, 'Bout')})
        </CardTitle>
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
              Show {more.length} more {plural(more.length, 'fight')} →
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

/** The bout's date and event, joined by a bullet only when it has both. */
function boutDetails({ boutDate, eventName }: ProfileBout): string {
  return [boutDate, eventName]
    .map(part => part?.trim())
    .filter(Boolean)
    .join(' • ')
}

function BoutRow({ bout, opponentSlug }: { bout: ProfileBout; opponentSlug: string | undefined }) {
  const details = boutDetails(bout)
  return (
    <li className="border-b pb-3 last:border-0">
      <div className="flex justify-between items-start">
        {/* `min-w-0` lets the column shrink and a word wider than a phone break, instead of
            pushing the result off the card and scrolling the page sideways (#75). The opponent's
            name is text in this column, not a flex item, so a long one wraps here too (#98). */}
        <div className="min-w-0 flex-1 break-words">
          <div>
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
          </div>
          {details && <div className="text-sm text-muted-foreground mt-1">{details}</div>}
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
