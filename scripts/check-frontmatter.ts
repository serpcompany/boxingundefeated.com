/**
 * Validates the frontmatter of the markdown articles served from apps/web/content/blog
 * (the /shop/best/* pages). Read-only: it reports problems and exits 1, it never rewrites files.
 *
 * Usage:
 *   pnpm check:frontmatter                 # check every article
 *   pnpm check:frontmatter <file> [...]    # check specific files (used by lefthook)
 */
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const contentDirectory = path.join(process.cwd(), 'apps/web/content/blog')
const isMarkdown = (file: string) => file.endsWith('.md') || file.endsWith('.mdx')

function listMarkdownFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) return listMarkdownFiles(fullPath)
    return isMarkdown(entry.name) ? [fullPath] : []
  })
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

function checkFile(filePath: string): { errors: string[]; slug?: string } {
  let data: Record<string, unknown>
  try {
    data = matter(fs.readFileSync(filePath, 'utf8')).data
  } catch (error) {
    return {
      errors: [`invalid frontmatter: ${error instanceof Error ? error.message : String(error)}`]
    }
  }

  const errors: string[] = []

  if (!isNonEmptyString(data.title)) errors.push('missing title')

  if (!isNonEmptyString(data.slug)) {
    errors.push('missing slug')
  } else if (!data.slug.startsWith('/') || !data.slug.endsWith('/')) {
    errors.push(`slug must start and end with "/" (got "${data.slug}")`)
  }

  if (!isNonEmptyString(data.excerpt) && !isNonEmptyString(data.description)) {
    errors.push('missing excerpt or description')
  }

  const date = data.publishDate ?? data.date
  if (date === undefined) {
    errors.push('missing publishDate or date')
  } else if (Number.isNaN(new Date(date as string).getTime())) {
    errors.push(`invalid publishDate/date: ${String(date)}`)
  }

  return { errors, slug: isNonEmptyString(data.slug) ? data.slug : undefined }
}

function main() {
  if (!fs.existsSync(contentDirectory)) {
    console.error(`Content directory not found: ${contentDirectory}`)
    process.exit(1)
  }

  const args = process.argv.slice(2)
  const files = args.length
    ? args.filter(isMarkdown).map(file => path.resolve(file))
    : listMarkdownFiles(contentDirectory)

  let failures = 0
  const slugs = new Map<string, string>()

  for (const file of files) {
    const relative = path.relative(process.cwd(), file)
    const { errors, slug } = checkFile(file)

    if (!args.length && slug) {
      const existing = slugs.get(slug)
      if (existing) errors.push(`duplicate slug ${slug} (also in ${existing})`)
      else slugs.set(slug, relative)
    }

    if (errors.length) {
      failures++
      for (const error of errors) console.error(`${relative}: ${error}`)
    }
  }

  if (failures) {
    console.error(`\n${failures} of ${files.length} files have frontmatter errors`)
    process.exit(1)
  }

  console.log(`Frontmatter valid in ${files.length} files`)
}

main()
