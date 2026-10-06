/**
 * @jest-environment node
 */
import { getCloudflareContext } from '@opennextjs/cloudflare'
import {
  DataBindingError,
  type DataBindings,
  getDatabase,
  requireDatabaseBinding
} from './database'

jest.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: jest.fn() }))

const binding = {} as D1Database

function withBindings(env: DataBindings) {
  jest.mocked(getCloudflareContext).mockResolvedValue({ env } as never)
}

describe('requireDatabaseBinding', () => {
  it('returns DB when SITE_ENVIRONMENT is local, staging or production', () => {
    for (const SITE_ENVIRONMENT of ['local', 'staging', 'production']) {
      expect(requireDatabaseBinding({ DB: binding, SITE_ENVIRONMENT })).toBe(binding)
    }
  })

  it('fails closed without the DB binding', () => {
    expect(() => requireDatabaseBinding({ SITE_ENVIRONMENT: 'production' })).toThrow(
      DataBindingError
    )
  })

  it('fails closed without a known SITE_ENVIRONMENT', () => {
    expect(() => requireDatabaseBinding({ DB: binding })).toThrow(DataBindingError)
    expect(() => requireDatabaseBinding({ DB: binding, SITE_ENVIRONMENT: 'Production' })).toThrow(
      /SITE_ENVIRONMENT is "Production"/
    )
  })
})

describe('getDatabase', () => {
  it('wraps the Worker binding from the Cloudflare context', async () => {
    withBindings({ DB: binding, SITE_ENVIRONMENT: 'local' })
    await expect(getDatabase()).resolves.toBeDefined()
    expect(getCloudflareContext).toHaveBeenCalledWith({ async: true })
  })

  it('rejects when the Worker has no DB binding', async () => {
    withBindings({ SITE_ENVIRONMENT: 'local' })
    await expect(getDatabase()).rejects.toThrow(DataBindingError)
  })
})
