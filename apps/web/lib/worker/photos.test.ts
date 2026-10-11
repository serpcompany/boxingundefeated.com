import { describe, expect, it, vi } from 'vitest'
import type { DatasetReadiness } from './dataset-gate'
import { handleWorkerRequest, type WorkerRuntime } from './handle-request'
import {
  handlePhoto,
  isPhotoRequest,
  matchesIfNoneMatch,
  type PhotoBucket,
  type PhotoEvent,
  r2Photos
} from './photos'

const SHA = '0f'.repeat(32)
const KEY = `photos/${SHA}.jpg`
const ORIGIN = 'https://boxingundefeated.com'
const URL_PATH = `/${KEY}`
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4])
const ETAG = '"5d41402abc4b2a76b9719d911017c592"'
const UPLOADED = new Date('2026-10-12T01:02:03Z')

/** An in-memory stand-in for the R2 binding, with the If-None-Match behavior of `onlyIf`. */
function bucket(objects: Record<string, Uint8Array> = { [KEY]: JPEG }) {
  const describe = (key: string) =>
    ({
      key,
      size: objects[key]!.byteLength,
      httpEtag: ETAG,
      etag: ETAG.slice(1, -1),
      uploaded: UPLOADED
    }) as unknown as R2Object
  const fake = {
    head: vi.fn(async (key: string) => (objects[key] ? describe(key) : null)),
    get: vi.fn(async (key: string, options?: R2GetOptions) => {
      if (!objects[key]) return null
      const conditions = options?.onlyIf
      const ifNoneMatch = conditions instanceof Headers ? conditions.get('if-none-match') : null
      if (ifNoneMatch === ETAG || ifNoneMatch === '*') return describe(key)
      return { ...describe(key), body: new Response(objects[key]).body } as unknown as R2ObjectBody
    })
  }
  return fake satisfies PhotoBucket
}

const request = (path = URL_PATH, init?: RequestInit) => new Request(`${ORIGIN}${path}`, init)

describe('isPhotoRequest', () => {
  it('is exactly /photos/<sha256>.<ext>', () => {
    for (const extension of ['jpg', 'png', 'gif', 'webp']) {
      expect(isPhotoRequest(request(`/photos/${SHA}.${extension}`))).toBe(true)
    }
    expect(isPhotoRequest(request(`${URL_PATH}?v=1`))).toBe(true)
    for (const path of [
      `${URL_PATH}/`,
      `/photos/${SHA}.jpeg`,
      `/photos/${SHA}.JPG`,
      `/photos/${SHA.toUpperCase()}.jpg`,
      `/photos/${SHA.slice(2)}.jpg`,
      '/photos/',
      '/photos',
      `/boxers${URL_PATH}`,
      '/boxers/len-wickwar/'
    ]) {
      expect([path, isPhotoRequest(request(path))]).toEqual([path, false])
    }
  })
})

describe('handlePhoto', () => {
  it('serves the object with its type, length, ETag and a year of immutable caching', async () => {
    const photos = bucket()
    const response = await handlePhoto(request(), photos)

    expect(response.status).toBe(200)
    expect(Object.fromEntries(response.headers)).toEqual({
      'content-type': 'image/jpeg',
      'content-length': String(JPEG.byteLength),
      'cache-control': 'public, max-age=31536000, immutable',
      etag: ETAG,
      'last-modified': UPLOADED.toUTCString(),
      'x-content-type-options': 'nosniff'
    })
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(JPEG)
    expect(photos.get).toHaveBeenCalledWith(KEY, undefined)
  })

  it("takes the content type from the key's extension", async () => {
    for (const [extension, type] of [
      ['png', 'image/png'],
      ['gif', 'image/gif'],
      ['webp', 'image/webp']
    ]) {
      const key = `photos/${SHA}.${extension}`
      const response = await handlePhoto(request(`/${key}`), bucket({ [key]: JPEG }))
      expect(response.headers.get('content-type')).toBe(type)
    }
  })

  it('answers a matching If-None-Match with 304 and no body', async () => {
    const photos = bucket()
    const response = await handlePhoto(
      request(URL_PATH, { headers: { 'if-none-match': ETAG } }),
      photos
    )

    expect(response.status).toBe(304)
    expect(response.body).toBeNull()
    expect(response.headers.get('etag')).toBe(ETAG)
    expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
    const conditions = photos.get.mock.calls[0]![1]?.onlyIf as Headers
    // Only If-None-Match reaches R2, so no other precondition can turn into a 304.
    expect([...conditions.keys()]).toEqual(['if-none-match'])
  })

  it('ignores If-Match and If-Modified-Since rather than answer them with a wrong 304', async () => {
    const photos = bucket()
    const response = await handlePhoto(
      request(URL_PATH, {
        headers: { 'if-match': '"other"', 'if-modified-since': new Date().toUTCString() }
      }),
      photos
    )
    expect(response.status).toBe(200)
    expect(photos.get).toHaveBeenCalledWith(KEY, undefined)
  })

  it('answers a HEAD with a matching If-None-Match with 304 too', async () => {
    const photos = bucket()
    const head = (ifNoneMatch: string) =>
      handlePhoto(
        request(URL_PATH, { method: 'HEAD', headers: { 'if-none-match': ifNoneMatch } }),
        photos
      )

    const matching = await head(ETAG)
    expect(matching.status).toBe(304)
    expect(matching.body).toBeNull()
    expect(matching.headers.get('etag')).toBe(ETAG)
    expect(matching.headers.get('content-length')).toBeNull()
    expect((await head(`"other", W/${ETAG}`)).status).toBe(304)
    expect((await head('"other"')).status).toBe(200)
    expect(photos.get).not.toHaveBeenCalled()
  })

  it('answers HEAD from the object’s metadata, without reading its body', async () => {
    const photos = bucket()
    const response = await handlePhoto(request(URL_PATH, { method: 'HEAD' }), photos)

    expect(response.status).toBe(200)
    expect(response.headers.get('content-length')).toBe(String(JPEG.byteLength))
    expect(response.headers.get('content-type')).toBe('image/jpeg')
    expect(await response.text()).toBe('')
    expect(photos.get).not.toHaveBeenCalled()
  })

  it('answers 404 for a key the bucket lacks, uncached, and reports it', async () => {
    const events: PhotoEvent[] = []
    const missing = `/photos/${'e'.repeat(64)}.png`
    for (const method of ['GET', 'HEAD']) {
      const response = await handlePhoto(request(missing, { method }), bucket(), {
        observe: event => events.push(event)
      })
      expect(response.status).toBe(404)
      expect(response.headers.get('cache-control')).toBe('no-store')
      expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8')
      expect(response.headers.get('x-robots-tag')).toBe('noindex')
    }
    expect(events).toEqual([
      { event: 'photo', status: 404, key: missing.slice(1) },
      { event: 'photo', status: 404, key: missing.slice(1) }
    ])
  })

  it('refuses other methods', async () => {
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const photos = bucket()
      const response = await handlePhoto(request(URL_PATH, { method }), photos)
      expect(response.status).toBe(405)
      expect(response.headers.get('allow')).toBe('GET, HEAD')
      expect(photos.get).not.toHaveBeenCalled()
      expect(photos.head).not.toHaveBeenCalled()
    }
  })

  it('answers a generic 500 when R2 fails, and logs only the cause', async () => {
    const events: PhotoEvent[] = []
    const photos = bucket()
    photos.get.mockRejectedValueOnce(new Error('R2 is down'))
    const response = await handlePhoto(request(), photos, { observe: event => events.push(event) })

    expect(response.status).toBe(500)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.text()).not.toContain('R2 is down')
    expect(events).toEqual([{ event: 'photo', status: 500, key: KEY, error: 'Error: R2 is down' }])
  })

  it('has no handler without the PHOTOS binding', () => {
    expect(r2Photos({})).toBeUndefined()
    expect(r2Photos({ PHOTOS: bucket() })).toBeTypeOf('function')
  })
})

describe('matchesIfNoneMatch', () => {
  it('compares tags weakly, in a list, or any tag for *', () => {
    expect(matchesIfNoneMatch(ETAG, ETAG)).toBe(true)
    expect(matchesIfNoneMatch(`W/${ETAG}`, ETAG)).toBe(true)
    expect(matchesIfNoneMatch(` "a" , ${ETAG}`, ETAG)).toBe(true)
    expect(matchesIfNoneMatch('*', ETAG)).toBe(true)
    expect(matchesIfNoneMatch('"a", "b"', ETAG)).toBe(false)
    expect(matchesIfNoneMatch(null, ETAG)).toBe(false)
    expect(matchesIfNoneMatch(ETAG, null)).toBe(false)
  })
})

/** A Cache API stand-in, keyed by URL, which keeps a copy of what was put. */
function fakeCache() {
  const entries = new Map<string, { body: ArrayBuffer; init: ResponseInit }>()
  const pending: Promise<unknown>[] = []
  const cache = {
    match: vi.fn(async (key: Request) => {
      const entry = entries.get(key.url)
      return entry ? new Response(entry.body.slice(0), entry.init) : undefined
    }),
    put: vi.fn(async (key: Request, response: Response) => {
      expect(key.method).toBe('GET')
      entries.set(key.url, {
        body: await response.arrayBuffer(),
        init: { status: response.status, headers: new Headers(response.headers) }
      })
    })
  }
  const runtime = {
    context: { waitUntil: (promise: Promise<unknown>) => void pending.push(promise) },
    openCache: vi.fn(async () => cache as unknown as Cache)
  }
  return { cache, entries, runtime, settled: () => Promise.all(pending) }
}

describe('handlePhoto with the Cache API', () => {
  it('stores a 200 photo on a miss, then answers from the cache without R2', async () => {
    const photos = bucket()
    const edge = fakeCache()

    const miss = await handlePhoto(request(), photos, { cache: edge.runtime })
    expect(miss.status).toBe(200)
    expect(miss.headers.get('x-edge-cache')).toBe('MISS')
    expect(new Uint8Array(await miss.arrayBuffer())).toEqual(JPEG)
    await edge.settled()
    expect(edge.cache.put).toHaveBeenCalledTimes(1)
    const stored = edge.entries.get(`${ORIGIN}${URL_PATH}`)!
    expect(new Uint8Array(stored.body)).toEqual(JPEG)
    const storedHeaders = new Headers(stored.init.headers)
    expect(storedHeaders.get('x-edge-cache')).toBeNull()
    expect(storedHeaders.get('cache-control')).toBe('public, max-age=31536000, immutable')
    expect(storedHeaders.get('etag')).toBe(ETAG)

    // The query never changes the photo, so it shares the entry.
    for (const path of [URL_PATH, `${URL_PATH}?v=2`]) {
      const hit = await handlePhoto(request(path), photos, { cache: edge.runtime })
      expect(hit.status).toBe(200)
      expect(Object.fromEntries(hit.headers)).toEqual({
        'content-type': 'image/jpeg',
        'content-length': String(JPEG.byteLength),
        'cache-control': 'public, max-age=31536000, immutable',
        etag: ETAG,
        'last-modified': UPLOADED.toUTCString(),
        'x-content-type-options': 'nosniff',
        'x-edge-cache': 'HIT'
      })
      expect(new Uint8Array(await hit.arrayBuffer())).toEqual(JPEG)
    }
    expect(photos.get).toHaveBeenCalledTimes(1)
    expect(photos.head).not.toHaveBeenCalled()
    expect(edge.cache.put).toHaveBeenCalledTimes(1)
  })

  it('answers HEAD and a matching If-None-Match from the cache too', async () => {
    const photos = bucket()
    const edge = fakeCache()
    await (await handlePhoto(request(), photos, { cache: edge.runtime })).arrayBuffer()
    await edge.settled()
    photos.get.mockClear()

    const head = await handlePhoto(request(URL_PATH, { method: 'HEAD' }), photos, {
      cache: edge.runtime
    })
    expect(head.status).toBe(200)
    expect(head.body).toBeNull()
    expect(head.headers.get('content-length')).toBe(String(JPEG.byteLength))
    expect(head.headers.get('x-edge-cache')).toBe('HIT')

    for (const method of ['GET', 'HEAD']) {
      const conditional = await handlePhoto(
        request(URL_PATH, { method, headers: { 'if-none-match': ETAG } }),
        photos,
        { cache: edge.runtime }
      )
      expect(conditional.status).toBe(304)
      expect(conditional.body).toBeNull()
      expect(conditional.headers.get('etag')).toBe(ETAG)
      expect(conditional.headers.get('x-edge-cache')).toBe('HIT')
    }
    const other = await handlePhoto(
      request(URL_PATH, { headers: { 'if-none-match': '"other"' } }),
      photos,
      { cache: edge.runtime }
    )
    expect(other.status).toBe(200)
    expect(new Uint8Array(await other.arrayBuffer())).toEqual(JPEG)

    expect(photos.get).not.toHaveBeenCalled()
    expect(photos.head).not.toHaveBeenCalled()
  })

  it('never stores a 404, a 405, a 500, a HEAD or a 304', async () => {
    const edge = fakeCache()
    const photos = bucket()
    const missing = await handlePhoto(request(`/photos/${'e'.repeat(64)}.png`), photos, {
      cache: edge.runtime
    })
    expect(missing.status).toBe(404)
    expect(missing.headers.get('x-edge-cache')).toBeNull()

    const post = await handlePhoto(request(URL_PATH, { method: 'POST' }), photos, {
      cache: edge.runtime
    })
    expect(post.status).toBe(405)

    photos.get.mockRejectedValueOnce(new Error('R2 is down'))
    expect((await handlePhoto(request(), photos, { cache: edge.runtime })).status).toBe(500)

    const head = await handlePhoto(request(URL_PATH, { method: 'HEAD' }), photos, {
      cache: edge.runtime
    })
    expect(head.headers.get('x-edge-cache')).toBe('MISS')
    const conditional = await handlePhoto(
      request(URL_PATH, { headers: { 'if-none-match': ETAG } }),
      photos,
      { cache: edge.runtime }
    )
    expect(conditional.status).toBe(304)

    await edge.settled()
    expect(edge.cache.put).not.toHaveBeenCalled()
    expect(edge.entries.size).toBe(0)
    // A 405 is answered before the cache is even opened.
    expect(edge.runtime.openCache).toHaveBeenCalledTimes(4)
  })

  it('reads R2 when the cache fails', async () => {
    const photos = bucket()
    const edge = fakeCache()
    edge.cache.match.mockRejectedValueOnce(new Error('cache is down'))
    const response = await handlePhoto(request(), photos, { cache: edge.runtime })
    expect(response.status).toBe(200)
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(JPEG)
  })
})

describe('handleWorkerRequest with photos', () => {
  const production = { SITE_ENVIRONMENT: 'production', CANONICAL_HOST_REDIRECT: 'on' }
  const staging = {
    SITE_ENVIRONMENT: 'staging',
    CANONICAL_HOST_REDIRECT: 'on',
    STAGING_BASIC_AUTH_PASSWORD: 'stagingpassword'
  }

  function runtime(photos = bucket()) {
    const openCache = vi.fn()
    const datasetReadiness = vi.fn(
      async (): Promise<DatasetReadiness> => ({ ready: false, reason: 'no import has started' })
    )
    return {
      photos,
      openCache,
      datasetReadiness,
      runtime: {
        photos: r2Photos({ PHOTOS: photos }),
        edgeCache: { context: { waitUntil: () => {} }, openCache },
        datasetReadiness
      } satisfies WorkerRuntime
    }
  }

  it('serves a photo from R2 without D1, the edge cache or OpenNext, even before an import', async () => {
    const serve = vi.fn()
    const edge = runtime()
    const response = await handleWorkerRequest(request(), production, serve, edge.runtime)

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/jpeg')
    expect(response.headers.get('x-robots-tag')).toBeNull()
    expect(serve).not.toHaveBeenCalled()
    expect(edge.datasetReadiness).not.toHaveBeenCalled()
    expect(edge.openCache).not.toHaveBeenCalled()
  })

  it('sends www and workers.dev to the canonical host first', async () => {
    for (const host of [
      'https://www.boxingundefeated.com',
      'https://boxingundefeated-com-production.serp.workers.dev'
    ]) {
      const edge = runtime()
      const response = await handleWorkerRequest(
        new Request(`${host}${URL_PATH}`),
        production,
        vi.fn(),
        edge.runtime
      )
      expect(response.status).toBe(308)
      expect(response.headers.get('location')).toBe(`${ORIGIN}${URL_PATH}`)
      expect(edge.photos.get).not.toHaveBeenCalled()
    }
  })

  it("asks for staging's password first, and adds noindex outside production", async () => {
    const STAGING = 'https://staging.boxingundefeated.com'
    const refused = runtime()
    const anonymous = await handleWorkerRequest(
      new Request(`${STAGING}${URL_PATH}`),
      staging,
      vi.fn(),
      refused.runtime
    )
    expect(anonymous.status).toBe(401)
    expect(refused.photos.get).not.toHaveBeenCalled()

    const smoke = await handleWorkerRequest(
      new Request(`${STAGING}${URL_PATH}`, { headers: { 'x-boxingundefeated-smoke-test': '1' } }),
      staging,
      vi.fn(),
      runtime().runtime
    )
    expect(smoke.status).toBe(200)
    expect(smoke.headers.get('x-robots-tag')).toBe('noindex')
  })

  it('leaves a slashed or malformed photo path to OpenNext (its slash redirect or 404 page)', async () => {
    for (const path of [`${URL_PATH}/`, `/photos/${SHA}.jpeg`, '/photos/']) {
      const serve = vi.fn(async () => new Response('from OpenNext', { status: 404 }))
      const edge = runtime()
      const response = await handleWorkerRequest(request(path), production, serve, edge.runtime)
      expect(await response.text()).toBe('from OpenNext')
      expect(edge.photos.get).not.toHaveBeenCalled()
    }
  })
})
