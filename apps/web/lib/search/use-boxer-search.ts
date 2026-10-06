'use client'

import { useEffect, useState } from 'react'
import type { SearchResponse } from './contract'
import type { SearchSource } from './sources'

/** How long typing must pause before a search is sent. */
export const SEARCH_DEBOUNCE_MS = 250

export type BoxerSearchState =
  | { status: 'idle' }
  /** `previous` is the last answer, shown dimmed while the next one loads. */
  | { status: 'loading'; query: string; previous?: SearchResponse }
  | { status: 'done'; query: string; response: SearchResponse }
  | { status: 'error'; query: string; message: string }

/**
 * Searches `source` for `input` once typing pauses for `debounceMs`. Each new input cancels the
 * pending search (its timer and its request), so an older answer never replaces a newer one.
 */
export function useBoxerSearch(
  input: string,
  source: SearchSource,
  debounceMs = SEARCH_DEBOUNCE_MS
): BoxerSearchState {
  const [state, setState] = useState<BoxerSearchState>({ status: 'idle' })

  useEffect(() => {
    const query = input.trim()
    if (!query) {
      setState({ status: 'idle' })
      return
    }
    setState(current => ({
      status: 'loading',
      query,
      previous:
        current.status === 'done'
          ? current.response
          : current.status === 'loading'
            ? current.previous
            : undefined
    }))
    const controller = new AbortController()
    const timer = setTimeout(() => {
      source(query, controller.signal).then(
        response => {
          if (!controller.signal.aborted) setState({ status: 'done', query, response })
        },
        (error: unknown) => {
          if (controller.signal.aborted) return
          const message =
            error instanceof Error && error.name === 'SearchUnavailableError'
              ? error.message
              : 'Search is unavailable right now. Please try again.'
          setState({ status: 'error', query, message })
        }
      )
    }, debounceMs)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [input, source, debounceMs])

  return state
}
