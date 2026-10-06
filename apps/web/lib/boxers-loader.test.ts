/** The listed slugs as a build target loads them, with a fresh module-level cache. */
function listedSlugs(target: 'export' | 'worker'): string[] {
  const previous = process.env.SITE_BUILD_OUTPUT
  process.env.SITE_BUILD_OUTPUT = target
  try {
    let slugs: string[] = []
    jest.isolateModules(() => {
      const loader: typeof import('./boxers-loader') = require('./boxers-loader')
      slugs = loader.getBoxersWithoutBouts().map(boxer => boxer.slug)
    })
    return slugs
  } finally {
    process.env.SITE_BUILD_OUTPUT = previous
  }
}

describe('boxer listings and the importer’s intentional drops', () => {
  it('keep `world` in the static export, where its page exists', () => {
    expect(listedSlugs('export')).toContain('world')
  })

  it('leave `world` out of the Worker build, whose profiles come from D1', () => {
    const slugs = listedSlugs('worker')
    expect(slugs).not.toContain('world')
    expect(slugs).toContain('jesse-hart')
  })
})
