import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { PageFacts } from './html'
import {
  classifyReference,
  compare,
  expectedCanonical,
  exportPaths,
  type Fetched,
  isAllowed,
  normalizePath,
  parseOptions,
  retryDelay,
  sitemapLocations
} from './parity'

const facts = (overrides: Partial<PageFacts> = {}): PageFacts => ({
  title: 'Manuel Ortiz - Professional Boxer',
  canonical: 'https://boxingundefeated.com/boxers/manuel-ortiz/',
  canonicalCount: 1,
  ogUrl: null,
  h1: 'Manuel Ortiz',
  robots: null,
  ...overrides
})
const ok = (overrides: Partial<PageFacts> = {}): Fetched => ({
  status: 200,
  location: null,
  facts: facts(overrides)
})
const path = '/boxers/manuel-ortiz/'

describe('compare', () => {
  it('passes the same page', () => {
    expect(compare(path, facts(), ok(), 'production')).toEqual([])
  })

  it('needs a 200 at the same URL', () => {
    const redirect: Fetched = { status: 308, location: '/x/', facts: null }
    expect(compare(path, facts(), redirect, 'production')).toEqual([
      { path, field: 'status', expected: '200', actual: '308 -> /x/' }
    ])
    const failed: Fetched = { status: 0, location: null, facts: null, error: 'timeout' }
    expect(compare(path, facts(), failed, 'production')[0].actual).toBe('error: timeout')
  })

  it('reports each field that differs', () => {
    const candidate = ok({ title: 'Other', canonical: null, h1: 'Other', robots: 'noindex' })
    expect(compare(path, facts(), candidate, 'production').map(d => d.field)).toEqual([
      'title',
      'canonical',
      'h1',
      'robots'
    ])
  })

  it('expects staging canonicals and noindex outside production', () => {
    const staging = ok({
      canonical: 'https://staging.boxingundefeated.com/boxers/manuel-ortiz/',
      robots: 'noindex'
    })
    expect(compare(path, facts(), staging, 'staging')).toEqual([])
    expect(compare(path, facts(), ok({ ...staging.facts, robots: null }), 'staging')).toEqual([
      { path, field: 'robots', expected: 'noindex', actual: null }
    ])
    expect(compare(path, facts(), ok({ robots: 'noindex' }), 'staging')[0].field).toBe('canonical')
  })
})

describe('expectedCanonical', () => {
  it('moves production canonicals to the environment origin', () => {
    expect(expectedCanonical('https://boxingundefeated.com', 'staging')).toBe(
      'https://staging.boxingundefeated.com'
    )
    expect(expectedCanonical('https://boxingundefeated.com/a/', 'local')).toBe(
      'http://localhost:8787/a/'
    )
    expect(expectedCanonical('https://boxingundefeated.com/a/', 'production')).toBe(
      'https://boxingundefeated.com/a/'
    )
    expect(expectedCanonical('https://boxingundefeated.community/', 'staging')).toBe(
      'https://boxingundefeated.community/'
    )
  })
})

describe('URLs', () => {
  it('normalizes paths the way fetch sends them', () => {
    expect(normalizePath('/shop/best/brümate-water-bottles/')).toBe(
      '/shop/best/br%C3%BCmate-water-bottles/'
    )
    expect(normalizePath("/shop/best/men's-water-bottles/")).toBe("/shop/best/men's-water-bottles/")
  })

  it('reads sitemap locations', () => {
    const xml =
      '<urlset><url><loc>https://boxingundefeated.com</loc></url><url><loc>\n  https://boxingundefeated.com/a/?x=1&amp;y=2 </loc></url></urlset>'
    expect(sitemapLocations(xml)).toEqual([
      'https://boxingundefeated.com',
      'https://boxingundefeated.com/a/?x=1&y=2'
    ])
  })

  it('lists the pages of a static export, without the not-found page', () => {
    const out = mkdtempSync(join(tmpdir(), 'parity-'))
    for (const dir of ['', '404', 'boxers/manuel-ortiz', 'shop/best/brümate-water-bottles']) {
      mkdirSync(join(out, dir), { recursive: true })
      writeFileSync(join(out, dir, 'index.html'), '')
    }
    writeFileSync(join(out, '404.html'), '')
    expect(exportPaths(out).sort()).toEqual([
      '/',
      '/boxers/manuel-ortiz/',
      '/shop/best/br%C3%BCmate-water-bottles/'
    ])
  })
})

describe('classifyReference', () => {
  const answer = (status: number, extra: Partial<Fetched> = {}): Fetched => ({
    status,
    location: null,
    facts: null,
    ...extra
  })

  it('compares a 200', () => {
    expect(classifyReference(ok(), true)).toEqual({ kind: 'compare', facts: facts() })
  })

  it('accepts a 404 or 410 only for an export page the sitemaps do not list', () => {
    expect(classifyReference(answer(404), false)).toEqual({ kind: 'not-served', status: 404 })
    expect(classifyReference(answer(410), false).kind).toBe('not-served')
    expect(classifyReference(answer(404), true)).toEqual({
      kind: 'error',
      error: 'reference answered 404, and its sitemaps list the URL'
    })
  })

  it('fails on a 429 left after the retries, a 403, a redirect or a network error', () => {
    expect(classifyReference(answer(429, { attempts: 4 }), false)).toEqual({
      kind: 'error',
      error: 'reference answered 429 after 4 attempts'
    })
    expect(classifyReference(answer(403), false).kind).toBe('error')
    expect(classifyReference(answer(301, { location: '/a/' }), true)).toEqual({
      kind: 'error',
      error: 'reference answered 301 -> /a/, and its sitemaps list the URL'
    })
    expect(classifyReference(answer(0, { error: 'timeout' }), false).kind).toBe('error')
  })
})

describe('retryDelay', () => {
  it('backs off exponentially, or waits for Retry-After up to a minute', () => {
    expect([1, 2, 3].map(attempt => retryDelay(null, attempt))).toEqual([2_000, 4_000, 8_000])
    expect(retryDelay('5', 1)).toBe(5_000)
    expect(retryDelay('600', 1)).toBe(60_000)
    expect(retryDelay('Wed, 21 Oct 2026 07:28:00 GMT', 2)).toBe(4_000)
  })
})

describe('isAllowed', () => {
  it('matches the path and the field', () => {
    const allowlist = [
      { path: '/shop/best/brümate-water-bottles/', field: 'status' as const, reason: 'x' }
    ]
    const difference = {
      path: '/shop/best/br%C3%BCmate-water-bottles/',
      field: 'status' as const,
      expected: '200',
      actual: '404'
    }
    expect(isAllowed(difference, allowlist)).toBe(true)
    expect(isAllowed({ ...difference, field: 'title' }, allowlist)).toBe(false)
    expect(isAllowed({ ...difference, path: '/boxers/world/' }, allowlist)).toBe(false)
  })

  it('matches the actual value when the entry pins one', () => {
    const allowlist = [
      { path: '/boxers/world/', field: 'status' as const, actual: '404', reason: 'x' }
    ]
    const difference = { path: '/boxers/world/', field: 'status' as const, expected: '200' }
    expect(isAllowed({ ...difference, actual: '404' }, allowlist)).toBe(true)
    expect(isAllowed({ ...difference, actual: '500' }, allowlist)).toBe(false)
    expect(isAllowed({ ...difference, actual: '308 -> /boxers/' }, allowlist)).toBe(false)
  })
})

describe('parseOptions', () => {
  it('takes the candidate after pnpm’s --, with defaults', () => {
    const options = parseOptions(['--', 'https://staging.boxingundefeated.com/'], {
      EXPECT_ENV: 'staging',
      INIT_CWD: '/repo'
    })
    expect(options).toMatchObject({
      candidate: 'https://staging.boxingundefeated.com',
      reference: 'https://boxingundefeated.com',
      concurrency: 8,
      environment: 'staging'
    })
  })

  it('caps remote concurrency at 8 and rejects unknown options', () => {
    expect(parseOptions(['https://x.workers.dev', '--concurrency=32'], {}).concurrency).toBe(8)
    expect(
      parseOptions(
        ['http://localhost:8805', '--reference', 'http://localhost:8806', '--concurrency', '32'],
        {}
      ).concurrency
    ).toBe(32)
    expect(() => parseOptions(['https://x.dev', '--limit', '3'], {})).toThrow(/Unknown option/)
    expect(() => parseOptions([], {})).toThrow(/Usage/)
  })
})
