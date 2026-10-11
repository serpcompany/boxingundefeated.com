import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getBoxerProfile } from '../queries'
import { createTestDatabase, type TestDatabase } from '../test-support'
import {
  buildImportStatements,
  buildPhotoUpserts,
  createPacer,
  fetchPhoto,
  isPhotoSourceUrl,
  PHOTO_USER_AGENT,
  type PhotoRow,
  photoSources,
  prepareDataset,
  retryAfterMs
} from '.'
import { sourceBoxer } from './test-records'

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46])
const PHOTO = 'https://boxrec.com/images/thumb/8/83/1.jpeg/200px-1.jpeg'
const PLACEHOLDER = 'https://boxrec.com/build/images/main/v6-avatar.svg'

describe('photoSources', () => {
  it("lists each boxrec photo once, in /boxers/'s order, and counts the rest", () => {
    const records = [
      sourceBoxer(1, 'Few Wins', { avatarImage: 'https://boxrec.com/images/a.jpg', proWins: 1 }),
      sourceBoxer(2, 'Most Wins', { avatarImage: 'https://boxrec.com/images/b.jpg', proWins: 9 }),
      sourceBoxer(3, 'Same Photo', { avatarImage: 'https://boxrec.com/images/a.jpg', proWins: 0 }),
      sourceBoxer(4, 'Placeholder', { avatarImage: PLACEHOLDER, proWins: 50 }),
      sourceBoxer(5, 'No Url', { avatarImage: null }),
      sourceBoxer(6, 'Elsewhere', { avatarImage: 'https://example.com/c.jpg', proWins: 99 }),
      sourceBoxer(7, 'Plain Http', { avatarImage: 'http://boxrec.com/images/d.jpg' })
    ]
    expect(photoSources(records)).toEqual({
      urls: ['https://boxrec.com/images/b.jpg', 'https://boxrec.com/images/a.jpg'],
      boxersWithPhoto: 3,
      boxersWithoutPhoto: 2,
      offSite: ['https://example.com/c.jpg', 'http://boxrec.com/images/d.jpg']
    })
  })

  it('fetches only https URLs on boxrec.com', () => {
    expect(isPhotoSourceUrl(PHOTO)).toBe(true)
    expect(isPhotoSourceUrl('https://www.boxrec.com/images/a.jpg')).toBe(true)
    for (const url of [
      'http://boxrec.com/images/a.jpg',
      'https://boxrec.com:8443/images/a.jpg',
      'https://boxrec.com.evil.test/a.jpg',
      'https://evilboxrec.com/a.jpg',
      'https://169.254.169.254/latest',
      'file:///etc/passwd',
      'not a url'
    ]) {
      expect([url, isPhotoSourceUrl(url)]).toEqual([url, false])
    }
  })
})

/** A fake `fetch` that answers each call with the next of `answers`, and records the calls. */
function fakeFetch(...answers: (Response | Error)[]) {
  const calls: { url: string; init: RequestInit | undefined }[] = []
  const fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    const answer = answers.shift()
    if (!answer) throw new Error('unexpected request')
    if (answer instanceof Error) throw answer
    return answer
  }) as typeof globalThis.fetch
  return { fetch, calls }
}

const image = (bytes: Uint8Array = JPEG, headers: Record<string, string> = {}) =>
  new Response(bytes, { status: 200, headers: { 'content-type': 'image/jpeg', ...headers } })

describe('fetchPhoto', () => {
  const sleeps: number[] = []
  const sleep = async (ms: number) => {
    sleeps.push(ms)
  }
  beforeEach(() => {
    sleeps.length = 0
  })

  it('identifies itself, asks for an image and keeps the bytes and their type', async () => {
    const { fetch, calls } = fakeFetch(image())
    const result = await fetchPhoto(PHOTO, { fetch, sleep })

    expect(result).toEqual({ ok: true, bytes: JPEG, extension: 'jpg', attempts: 1 })
    expect(calls).toHaveLength(1)
    const headers = calls[0]!.init?.headers as Record<string, string>
    expect(headers['user-agent']).toBe(PHOTO_USER_AGENT)
    expect(PHOTO_USER_AGENT).toMatch(/\(\+https:\/\/boxingundefeated\.com\/\)$/)
    expect(headers.accept).toBe('image/*')
    expect(calls[0]!.init?.redirect).toBe('manual')
  })

  it('paces every request, retries included', async () => {
    let paced = 0
    const { fetch } = fakeFetch(new Response(null, { status: 503 }), image())
    await fetchPhoto(PHOTO, { fetch, sleep, pace: async () => void paced++ })
    expect(paced).toBe(2)
  })

  it('keeps the type its bytes show, whatever the content type says', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])
    const { fetch } = fakeFetch(image(png, { 'content-type': 'image/jpeg' }))
    expect(await fetchPhoto(PHOTO, { fetch, sleep })).toMatchObject({ ok: true, extension: 'png' })
  })

  it('refuses an error page sent as an image', async () => {
    const html = new TextEncoder().encode('<!DOCTYPE html><title>Blocked</title>')
    const { fetch } = fakeFetch(image(html))
    expect(await fetchPhoto(PHOTO, { fetch, sleep })).toEqual({
      ok: false,
      reason: 'not an image',
      attempts: 1,
      refused: false
    })
  })

  it('gives up at once on a 404, 410 or 403, and only a 403 counts as a refusal', async () => {
    for (const [status, refused] of [
      [404, false],
      [410, false],
      [403, true]
    ] as const) {
      const { fetch, calls } = fakeFetch(new Response('no', { status }))
      expect(await fetchPhoto(PHOTO, { fetch, sleep })).toEqual({
        ok: false,
        reason: `HTTP ${status}`,
        attempts: 1,
        refused
      })
      expect(calls).toHaveLength(1)
    }
    expect(sleeps).toEqual([])
  })

  it('retries a 429 after its Retry-After, and a 5xx or network error after a doubling delay', async () => {
    const { fetch, calls } = fakeFetch(
      new Response(null, { status: 429, headers: { 'retry-after': '7' } }),
      new TypeError('fetch failed'),
      image()
    )
    expect(await fetchPhoto(PHOTO, { fetch, sleep, retryDelayMs: 1000, attempts: 3 })).toEqual({
      ok: true,
      bytes: JPEG,
      extension: 'jpg',
      attempts: 3
    })
    expect(calls).toHaveLength(3)
    expect(sleeps).toEqual([7000, 2000])
  })

  it('stops after the last attempt and reports the last reason', async () => {
    const { fetch, calls } = fakeFetch(
      new Response(null, { status: 502 }),
      new Response(null, { status: 503 })
    )
    expect(await fetchPhoto(PHOTO, { fetch, sleep, attempts: 2, retryDelayMs: 10 })).toEqual({
      ok: false,
      reason: 'HTTP 503',
      attempts: 2,
      refused: true
    })
    expect(calls).toHaveLength(2)
    expect(sleeps).toEqual([10])
  })

  it('counts a timeout or network error that outlasts the retries as a refusal', async () => {
    const timeout = Object.assign(new Error('timed out'), { name: 'TimeoutError' })
    const { fetch } = fakeFetch(timeout, new TypeError('fetch failed'))
    expect(await fetchPhoto(PHOTO, { fetch, sleep, attempts: 2 })).toEqual({
      ok: false,
      reason: 'network error',
      attempts: 2,
      refused: true
    })
  })

  it('caps a long Retry-After', async () => {
    const { fetch } = fakeFetch(
      new Response(null, { status: 429, headers: { 'retry-after': '86400' } }),
      image()
    )
    await fetchPhoto(PHOTO, { fetch, sleep, maxRetryAfterMs: 60_000 })
    expect(sleeps).toEqual([60_000])
  })

  it('follows a redirect on boxrec.com, and refuses one anywhere else', async () => {
    const onSite = fakeFetch(
      new Response(null, { status: 301, headers: { location: '/images/moved.jpg' } }),
      image()
    )
    expect(await fetchPhoto(PHOTO, { fetch: onSite.fetch, sleep })).toMatchObject({ ok: true })
    expect(onSite.calls.map(call => call.url)).toEqual([
      PHOTO,
      'https://boxrec.com/images/moved.jpg'
    ])

    const offSite = fakeFetch(
      new Response(null, { status: 302, headers: { location: 'https://cdn.example.com/x.jpg' } })
    )
    expect(await fetchPhoto(PHOTO, { fetch: offSite.fetch, sleep })).toEqual({
      ok: false,
      reason: 'redirect off boxrec.com',
      attempts: 1,
      refused: false
    })
    expect(offSite.calls).toHaveLength(1)
  })

  it('stops after three redirects', async () => {
    const loop = () => new Response(null, { status: 302, headers: { location: PHOTO } })
    const { fetch, calls } = fakeFetch(loop(), loop(), loop(), loop())
    expect(await fetchPhoto(PHOTO, { fetch, sleep })).toEqual({
      ok: false,
      reason: 'too many redirects',
      attempts: 1,
      refused: false
    })
    expect(calls).toHaveLength(4)
  })

  it('refuses a file over the size cap, declared or not', async () => {
    const big = new Uint8Array(64).fill(0xff)
    const declared = fakeFetch(image(JPEG, { 'content-length': '100' }))
    expect(await fetchPhoto(PHOTO, { fetch: declared.fetch, sleep, maxBytes: 50 })).toMatchObject({
      ok: false,
      reason: 'too large'
    })
    const streamed = fakeFetch(image(big))
    expect(await fetchPhoto(PHOTO, { fetch: streamed.fetch, sleep, maxBytes: 50 })).toMatchObject({
      ok: false,
      reason: 'too large'
    })
  })

  it('never requests a URL off boxrec.com', async () => {
    const { fetch, calls } = fakeFetch()
    expect(await fetchPhoto('https://example.com/a.jpg', { fetch, sleep })).toEqual({
      ok: false,
      reason: 'not on boxrec.com',
      attempts: 0,
      refused: false
    })
    expect(calls).toEqual([])
  })
})

describe('retryAfterMs', () => {
  it('reads seconds or an HTTP date, never past the cap or below zero', () => {
    const now = Date.parse('2026-10-12T00:00:00Z')
    expect(retryAfterMs('3', 60_000, now)).toBe(3000)
    expect(retryAfterMs('Mon, 12 Oct 2026 00:00:10 GMT', 60_000, now)).toBe(10_000)
    expect(retryAfterMs('Sun, 11 Oct 2026 00:00:00 GMT', 60_000, now)).toBe(0)
    expect(retryAfterMs('999', 60_000, now)).toBe(60_000)
    expect(retryAfterMs(null, 60_000, now)).toBeUndefined()
    expect(retryAfterMs('soon', 60_000, now)).toBeUndefined()
  })
})

describe('createPacer', () => {
  it('spaces requests at least the interval apart, from start to start', async () => {
    let clock = 1000
    const slept: number[] = []
    const pacer = createPacer(500, {
      now: () => clock,
      sleep: async ms => {
        slept.push(ms)
        clock += ms
      }
    })
    await pacer.wait() // at 1000, at once
    clock += 100 // the request took 100 ms
    await pacer.wait() // waits until 1500
    clock += 900 // a slow request: the next may go at once
    await pacer.wait()
    expect(slept).toEqual([400])
    expect(clock).toBe(2400)
  })

  it('keeps the interval after a sleep that wakes late', async () => {
    let clock = 1000
    const oversleeps = [200, 0, 350, 0] // how late each sleep wakes, in order
    const pacer = createPacer(500, {
      now: () => clock,
      sleep: async ms => {
        clock += ms + (oversleeps.shift() ?? 0)
      }
    })
    const starts: number[] = []
    for (let request = 0; request < 5; request++) {
      await pacer.wait()
      starts.push(clock) // the request starts here and takes no time
    }
    const gaps = starts.slice(1).map((start, index) => start - starts[index]!)
    expect(gaps).toHaveLength(4)
    for (const gap of gaps) expect(gap).toBeGreaterThanOrEqual(500)
  })
})

describe('buildPhotoUpserts', () => {
  let test: TestDatabase
  beforeEach(async () => {
    test = await createTestDatabase()
  })
  afterEach(async () => {
    await test.dispose()
  })

  const key = `photos/${'c'.repeat(64)}.jpg`
  const row: PhotoRow = { sourceUrl: PHOTO, key, contentType: 'image/jpeg', bytes: 8709 }

  async function apply(rows: PhotoRow[]): Promise<number> {
    const results = await test.binding.batch(
      buildPhotoUpserts(rows).map(statement => test.binding.prepare(statement))
    )
    return results.reduce((total, result) => total + (result.meta.changes ?? 0), 0)
  }

  it('records a copy once, and a re-run writes nothing', async () => {
    expect(await apply([row])).toBe(1)
    expect(await apply([row])).toBe(0)
    const { results } = await test.binding.prepare('SELECT * FROM photos').all()
    expect(results).toEqual([
      {
        source_url: PHOTO,
        key,
        content_type: 'image/jpeg',
        bytes: 8709,
        copied_at: expect.any(String)
      }
    ])
  })

  it("gives the imported boxer's page the key of their photo", async () => {
    const dataset = prepareDataset([sourceBoxer(1, 'Ana Alpha', { avatarImage: PHOTO })])
    await test.binding.batch(
      buildImportStatements(dataset).map(statement => test.binding.prepare(statement))
    )
    expect((await getBoxerProfile(test.db, 'ana-alpha'))?.boxer.photoKey).toBeNull()
    await apply([row])
    expect((await getBoxerProfile(test.db, 'ana-alpha'))?.boxer.photoKey).toBe(key)
  })
})
