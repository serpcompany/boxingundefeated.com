import { Breadcrumb } from '@boxingundefeated/design-system/breadcrumb'
import { Card, CardContent, CardHeader, CardTitle } from '@boxingundefeated/design-system/card'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FightHistory } from '@/components/fight-history'
import { OptimizedImage } from '@/components/optimized-image'
import { getBoxerProfile } from '@/lib/boxer-data'
import { formatNickname, plural } from '@/lib/boxer-data/display'
import { getBoxerStats } from '@/lib/boxer-stats'
import {
  createBoxerMetaDescription,
  createNotFoundMetadata,
  createPageMetadata
} from '@/lib/metadata'
import { getSiteOrigin } from '@/lib/site-config'
import { normalizeInternalPath, toAbsoluteUrl } from '@/lib/url-utils'

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const profile = await getBoxerProfile(slug)
  const baseUrl = getSiteOrigin()

  if (!profile) {
    return createNotFoundMetadata()
  }
  const { boxer } = profile

  // The owner's keyword pattern; a long name drops the site name rather than be cut (#87).
  return createPageMetadata({
    title: `${boxer.name} Record, Stats & Fights`,
    siteNameIfFits: true,
    description: createBoxerMetaDescription(boxer),
    canonical: toAbsoluteUrl(baseUrl, `/boxers/${slug}`)
  })
}

export default async function BoxerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const profile = await getBoxerProfile(slug)

  if (!profile) {
    notFound()
  }

  const { boxer, bouts, opponentLinks } = profile
  const baseUrl = getSiteOrigin()
  const stats = getBoxerStats(boxer)
  const nickname = formatNickname(boxer.nicknames)
  const wins = boxer.proWins || 0
  const knockouts = boxer.proWinsByKnockout || 0
  const breadcrumbItems = [
    { name: 'Boxers', href: '/boxers/' },
    { name: boxer.name, href: normalizeInternalPath(`/boxers/${slug}`) }
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb items={breadcrumbItems} baseUrl={baseUrl} />

      <div className="space-y-6 mt-6">
        {/* On phones the photo sits above the name, which gets the full width, and the nickname
            takes its own line; a word longer than the screen breaks rather than scrolling the
            page sideways (#75). From `sm` up, the photo and name sit side by side as before. */}
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:gap-6">
          <OptimizedImage
            src={boxer.photo}
            alt={boxer.name}
            width={128}
            height={128}
            className="w-32 h-32 rounded-full object-cover"
            priority={true}
          />
          <div className="min-w-0 max-w-full break-words">
            <h1 className="text-4xl font-bold tracking-tight mb-2">
              {boxer.name}
              {nickname && (
                <span className="block text-2xl text-muted-foreground sm:inline sm:ml-3">
                  {nickname}
                </span>
              )}
            </h1>
            {boxer.residence && <p className="text-muted-foreground">{boxer.residence}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Record</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.record}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {knockouts} {plural(knockouts, 'KO')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Win Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.winRate}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {wins} {plural(wins, 'victory', 'victories')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">KO Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.koRate}</div>
              <div className="text-sm text-muted-foreground mt-1">of victories</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Fighter Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {boxer.nationality && (
                <>
                  <dt className="text-sm text-muted-foreground">Nationality</dt>
                  <dd className="font-medium">{boxer.nationality}</dd>
                </>
              )}
              {boxer.proDivision && (
                <>
                  <dt className="text-sm text-muted-foreground">Division</dt>
                  <dd className="font-medium capitalize">{boxer.proDivision}</dd>
                </>
              )}
              {boxer.stance && (
                <>
                  <dt className="text-sm text-muted-foreground">Stance</dt>
                  <dd className="font-medium capitalize">{boxer.stance}</dd>
                </>
              )}
              {boxer.height && (
                <>
                  <dt className="text-sm text-muted-foreground">Height</dt>
                  <dd className="font-medium">{boxer.height} cm</dd>
                </>
              )}
              {boxer.reach && (
                <>
                  <dt className="text-sm text-muted-foreground">Reach</dt>
                  <dd className="font-medium">{boxer.reach}"</dd>
                </>
              )}
              {boxer.proStatus && (
                <>
                  <dt className="text-sm text-muted-foreground">Status</dt>
                  <dd className="font-medium capitalize">{boxer.proStatus}</dd>
                </>
              )}
              {boxer.proTotalBouts && (
                <>
                  <dt className="text-sm text-muted-foreground">Total Bouts</dt>
                  <dd className="font-medium">{boxer.proTotalBouts}</dd>
                </>
              )}
              {boxer.proTotalRounds && (
                <>
                  <dt className="text-sm text-muted-foreground">Total Rounds</dt>
                  <dd className="font-medium">{boxer.proTotalRounds}</dd>
                </>
              )}
              {boxer.birthPlace && (
                <>
                  <dt className="text-sm text-muted-foreground">Birth Place</dt>
                  <dd className="font-medium">{boxer.birthPlace}</dd>
                </>
              )}
              {boxer.dateOfBirth && (
                <>
                  <dt className="text-sm text-muted-foreground">Date of Birth</dt>
                  <dd className="font-medium">{boxer.dateOfBirth}</dd>
                </>
              )}
              {boxer.birthName && boxer.birthName !== boxer.name && (
                <>
                  <dt className="text-sm text-muted-foreground">Birth Name</dt>
                  <dd className="font-medium">{boxer.birthName}</dd>
                </>
              )}
              {boxer.proDebutDate && (
                <>
                  <dt className="text-sm text-muted-foreground">Pro Debut</dt>
                  <dd className="font-medium">{boxer.proDebutDate}</dd>
                </>
              )}
              {boxer.gym && (
                <>
                  <dt className="text-sm text-muted-foreground">Gym</dt>
                  <dd className="font-medium">{boxer.gym}</dd>
                </>
              )}
              {boxer.trainers && (
                <>
                  <dt className="text-sm text-muted-foreground">Trainers</dt>
                  <dd className="font-medium">{boxer.trainers}</dd>
                </>
              )}
              {boxer.managers && (
                <>
                  <dt className="text-sm text-muted-foreground">Managers</dt>
                  <dd className="font-medium">{boxer.managers}</dd>
                </>
              )}
              {boxer.promoters && (
                <>
                  <dt className="text-sm text-muted-foreground">Promoters</dt>
                  <dd className="font-medium">{boxer.promoters}</dd>
                </>
              )}
            </dl>
          </CardContent>
        </Card>

        {boxer.bio && (
          <Card>
            <CardHeader>
              <CardTitle>Biography</CardTitle>
            </CardHeader>
            <CardContent>
              {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Bio content is from trusted source */}
              <div
                className="space-y-4 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: boxer.bio }}
              />
            </CardContent>
          </Card>
        )}

        <FightHistory bouts={bouts} opponentLinks={opponentLinks} />
      </div>
    </div>
  )
}
