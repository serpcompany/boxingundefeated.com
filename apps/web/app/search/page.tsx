'use client'

import { SEARCH_QUERY_MAX_LENGTH } from '@boxingundefeated/data-ops/search'
import { Card, CardContent, CardHeader, CardTitle } from '@boxingundefeated/design-system/card'
import { Input } from '@boxingundefeated/design-system/input'
import { Search } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { type SearchResult, searchResultHref } from '@/lib/search/contract'
import { searchApi } from '@/lib/search/sources'
import { type BoxerSearchState, useBoxerSearch } from '@/lib/search/use-boxer-search'

export default function SearchPage() {
  // Searches D1 through /api/search.
  const [searchQuery, setSearchQuery] = useState('')
  const search = useBoxerSearch(searchQuery, searchApi)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Search Boxers</h1>
          <p className="text-muted-foreground">Search our database of professional boxers</p>
        </div>

        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input
            type="search"
            aria-label="Search boxers"
            placeholder="Search by name, nickname, country, or division..."
            value={searchQuery}
            maxLength={SEARCH_QUERY_MAX_LENGTH}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-lg"
            autoFocus
          />
        </div>

        <SearchResults state={search} />
      </div>
    </div>
  )
}

function SearchResults({ state }: { state: BoxerSearchState }) {
  if (state.status === 'idle') {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Start typing to search for boxers</p>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="text-center py-12" role="alert">
        <p className="text-muted-foreground">{state.message}</p>
      </div>
    )
  }

  const response = state.status === 'done' ? state.response : state.previous
  const loading = state.status === 'loading'
  if (!response) {
    return (
      <div className="text-center py-12" aria-live="polite" aria-busy="true">
        <p className="text-muted-foreground">Searching...</p>
      </div>
    )
  }

  const count = response.results.length
  return (
    <div className="space-y-4" aria-live="polite" aria-busy={loading}>
      <p className="text-sm text-muted-foreground">
        {loading
          ? 'Searching...'
          : response.truncated
            ? `Showing the top ${count} matches. Type more of the name to narrow them down.`
            : `Found ${count} ${count === 1 ? 'boxer' : 'boxers'}`}
      </p>
      {count > 0 ? (
        <div
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity ${loading ? 'opacity-60' : ''}`}
        >
          {response.results.map(boxer => (
            <SearchResultCard key={boxer.slug} boxer={boxer} />
          ))}
        </div>
      ) : (
        !loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No boxers found matching "{state.query}"</p>
          </div>
        )
      )}
    </div>
  )
}

function SearchResultCard({ boxer }: { boxer: SearchResult }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle>
          <Link href={searchResultHref(boxer)} className="hover:underline">
            {boxer.name}
          </Link>
          {boxer.nicknames && (
            <span className="block text-sm font-normal text-muted-foreground">
              {boxer.nicknames}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-sm text-muted-foreground">Record</dt>
            <dd className="font-semibold">
              {boxer.wins}-{boxer.losses}-{boxer.draws}
            </dd>
          </div>
          {boxer.division && (
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Division</dt>
              <dd className="capitalize">{boxer.division}</dd>
            </div>
          )}
          {boxer.nationality && (
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Country</dt>
              <dd>{boxer.nationality}</dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  )
}
