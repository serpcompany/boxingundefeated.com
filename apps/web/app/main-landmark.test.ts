import { readdirSync, readFileSync } from 'node:fs'
import { join, sep } from 'node:path'

// The root layout renders every page's one `<main>` landmark. A page or component that renders
// another nests a second `<main>`, which screen readers and accessibility audits flag, so pages
// wrap their content in a `<div>` or `<section>` instead. Scanning the source covers every page
// family, including pages added later.
const REPO_ROOT = join(__dirname, '..', '..', '..')
const SCANNED_DIRECTORIES = [
  'apps/web/app',
  'apps/web/components',
  'apps/web/lib',
  'packages/design-system'
]
const ROOT_LAYOUT = 'apps/web/app/layout.tsx'

// A JSX `<main>` element, an element with `role="main"`, or `createElement('main')`.
const MAIN_LANDMARK = /<main[\s/>]|role=\{?["'`]main["'`]|createElement\(\s*["'`]main["'`]/g

function sourceFiles(directory: string): string[] {
  return readdirSync(join(REPO_ROOT, directory), { recursive: true, encoding: 'utf8' })
    .filter(file => /\.[jt]sx?$/.test(file) && !/\.(test|d)\.[jt]sx?$/.test(file))
    .filter(file => !file.split(sep).some(part => part === 'node_modules' || part.startsWith('.')))
    .map(file => join(directory, file).split(sep).join('/'))
}

function countMainLandmarks(file: string): number {
  const source = readFileSync(join(REPO_ROOT, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

  return source.match(MAIN_LANDMARK)?.length ?? 0
}

describe('the <main> landmark', () => {
  const files = SCANNED_DIRECTORIES.flatMap(sourceFiles)

  it('scans the root layout and the pages', () => {
    expect(files).toEqual(
      expect.arrayContaining([
        ROOT_LAYOUT,
        'apps/web/app/page.tsx',
        'apps/web/app/shop/page.tsx',
        'apps/web/app/divisions/page.tsx',
        'apps/web/app/sitemap/page.tsx'
      ])
    )
  })

  it('is rendered once, by the root layout', () => {
    expect(countMainLandmarks(ROOT_LAYOUT)).toBe(1)
  })

  it('is not rendered again by any page or component', () => {
    const nested = files
      .filter(file => file !== ROOT_LAYOUT)
      .filter(file => countMainLandmarks(file) > 0)

    expect(nested).toEqual([])
  })
})
