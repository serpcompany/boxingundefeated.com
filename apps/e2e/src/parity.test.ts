import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { PageFacts } from './html'
import {
  compare,
  expectedCanonical,
  exportPaths,
  type Fetched,
  isAllowed,
  normalizePath,
  parseOptions,
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
