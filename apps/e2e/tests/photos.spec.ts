import { isNoindex } from '../src/html'
import { expect, target, test } from './site'

/**
 * Boxer photos, `/photos/<sha256>.<ext>`, which the Worker serves from the environment's R2 photo
 * bucket (#64, apps/web/lib/worker/photos.ts). A bucket may hold no photo yet (staging's and
 * production's fill when d1-import.yml's copy runs), so these check only the answers that need
 * none: a key the bucket lacks, a malformed path, another method and a slashed path.
 */
const MISSING = `/photos/${'e'.repeat(64)}.jpg`

test('a photo the bucket lacks answers 404, never stored, with noindex', async ({ request }) => {
  for (const method of ['GET', 'HEAD'] as const) {
    for (const attempt of ['first', 'repeat']) {
      const response = await request.fetch(MISSING, { method, maxRedirects: 0 })
      const headers = response.headers()
      expect(response.status(), `${method} ${attempt}`).toBe(404)
      expect(headers['cache-control'], `${method} ${attempt}`).toBe('no-store')
      expect(headers['x-edge-cache'], `${method} ${attempt}`).toBeUndefined()
      expect(
        isNoindex(headers['x-robots-tag']),
        `${method} ${attempt} X-Robots-Tag: ${headers['x-robots-tag']}`
      ).toBe(true)
    }
  }
})

test('a malformed photo path answers 404', async ({ request }) => {
  for (const path of [
    '/photos/abc.jpg',
    `/photos/${'E'.repeat(64)}.jpg`,
    `/photos/${'e'.repeat(64)}.jpeg`,
    `/photos/${'e'.repeat(64)}.svg`,
    `/photos/${'e'.repeat(63)}.jpg`
  ]) {
    const response = await request.get(path, { maxRedirects: 0 })
    expect(response.status(), path).toBe(404)
  }
})

test('a photo answers only GET and HEAD', async ({ request }) => {
  for (const method of ['POST', 'PUT', 'DELETE']) {
    const response = await request.fetch(MISSING, { method, maxRedirects: 0 })
    expect(response.status(), method).toBe(405)
    expect(response.headers().allow, method).toBe('GET, HEAD')
    expect(response.headers()['cache-control'], method).toBe('no-store')
  }
})

test('a photo path with a slash answers 308 to the file', async ({ request }) => {
  const response = await request.get(`${MISSING}/`, { maxRedirects: 0 })
  expect(response.status()).toBe(308)
  const location = new URL(response.headers().location ?? '', target.baseUrl)
  expect(location.origin, 'stays on the host').toBe(target.baseUrl)
  expect(location.pathname).toBe(MISSING)
})
