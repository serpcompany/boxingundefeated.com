/**
 * Checks that the static export GitHub Pages deploys is the production site: robots.txt allows
 * crawling and lists the sitemap index, no page is noindex, every page loads Google Tag Manager,
 * and every canonical uses the production origin. The Pages workflow sets no SITE_ENVIRONMENT, so
 * the export decides this itself (apps/web/lib/site-config.ts); this guards it until the cutover
 * to the Worker (#19).
 *
 * Usage, from the repository root, with the Pages workflow's environment:
 *   env -u SITE_ENVIRONMENT GITHUB_EVENT_NAME=push pnpm --filter web build:vercel
 *   pnpm check:export [--out-dir apps/web/out]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { isNoindex, pageFacts } from './html'
import { GTM_ID, PRODUCTION_ORIGIN } from './target'

const REPO_ROOT = resolve(import.meta.dirname, '../../..')

/**
 * Files that are Next.js's not-found page, which is noindex in every environment: the 404 page,
 * and two shop articles whose non-ASCII slugs the export renders as not found (a known bug, see
 * src/parity-allowlist.ts). They must still load Google Tag Manager.
 */
export const NOT_FOUND_FILES = [
  '404.html',
  '404/index.html',
  'shop/best/brümate-water-bottles/index.html',
  'shop/best/nestlé-water-bottles/index.html'
].map(file => file.normalize('NFC'))

export interface ExportProblem {
  file: string
  problem: string
}

function htmlFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return htmlFiles(path)
    return entry.name.endsWith('.html') ? [path] : []
  })
}

export function robotsProblems(robots: string): string[] {
  const lines = robots.split('\n').map(line => line.trim())
  const problems: string[] = []
  if (!lines.some(line => /^allow:\s*\/$/i.test(line))) problems.push('no "Allow: /"')
  if (lines.some(line => /^disallow:\s*\/$/i.test(line))) problems.push('"Disallow: /"')
  if (!lines.includes(`Sitemap: ${PRODUCTION_ORIGIN}/sitemap-index.xml`)) {
    problems.push(`no "Sitemap: ${PRODUCTION_ORIGIN}/sitemap-index.xml"`)
  }
  return problems
}

export function pageProblems(html: string, notFound = false): string[] {
  const facts = pageFacts(html)
  const problems: string[] = []
  if (!notFound && isNoindex(facts.robots)) {
    problems.push(`<meta name="robots" content="${facts.robots}">`)
  }
  if (!html.includes(GTM_ID)) problems.push(`no Google Tag Manager (${GTM_ID})`)
  if (
    facts.canonical !== null &&
    facts.canonical !== PRODUCTION_ORIGIN &&
    !facts.canonical.startsWith(`${PRODUCTION_ORIGIN}/`)
  ) {
    problems.push(`canonical ${facts.canonical}`)
  }
  return problems
}

export function checkExport(outDir: string): { pages: number; problems: ExportProblem[] } {
  const problems: ExportProblem[] = []
  const robotsPath = join(outDir, 'robots.txt')
  try {
    for (const problem of robotsProblems(readFileSync(robotsPath, 'utf8'))) {
      problems.push({ file: 'robots.txt', problem })
    }
  } catch {
    problems.push({ file: 'robots.txt', problem: 'missing' })
  }

  const files = htmlFiles(outDir)
  for (const file of files) {
    const name = relative(outDir, file).split('\\').join('/')
    const notFound = NOT_FOUND_FILES.includes(name.normalize('NFC'))
    for (const problem of pageProblems(readFileSync(file, 'utf8'), notFound)) {
      problems.push({ file: name, problem })
    }
  }
  const home = join(outDir, 'index.html')
  if (files.includes(home)) {
    const { canonical, ogUrl } = pageFacts(readFileSync(home, 'utf8'))
    if (canonical !== PRODUCTION_ORIGIN) {
      problems.push({ file: 'index.html', problem: `canonical ${canonical}` })
    }
    if (ogUrl !== PRODUCTION_ORIGIN) {
      problems.push({ file: 'index.html', problem: `og:url ${ogUrl}` })
    }
  } else {
    problems.push({ file: 'index.html', problem: 'missing' })
  }
  return { pages: files.length, problems }
}

function main() {
  const args = process.argv.slice(2).filter(arg => arg !== '--')
  const flag = args.indexOf('--out-dir')
  const cwd = process.env.INIT_CWD ?? process.cwd()
  const outDir = flag === -1 ? join(REPO_ROOT, 'apps/web/out') : resolve(cwd, args[flag + 1] ?? '')
  if (!statSync(outDir, { throwIfNoEntry: false })?.isDirectory()) {
    console.error(`No static export at ${outDir}. Build it first (see the header of this file).`)
    process.exit(1)
  }

  const { pages, problems } = checkExport(outDir)
  if (problems.length > 0) {
    console.error(`The export at ${outDir} is not the production site:`)
    for (const { file, problem } of problems.slice(0, 50)) console.error(`  ${file}: ${problem}`)
    if (problems.length > 50) console.error(`  … and ${problems.length - 50} more`)
    process.exit(1)
  }
  console.log(
    `OK: ${pages} HTML pages in ${relative(REPO_ROOT, outDir) || outDir} load ${GTM_ID}, use ` +
      `production canonicals and are indexable (except the ${NOT_FOUND_FILES.length} not-found ` +
      'pages); robots.txt allows crawling and lists the sitemap index.'
  )
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  main()
}
