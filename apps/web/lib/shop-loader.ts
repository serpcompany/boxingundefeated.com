import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import type { BlogPost } from './blog-loader'
import { BOXER_PAGE_SIZE } from './directory-pagination'
import { normalizeInternalPath } from './url-utils'

const shopPostsDirectory = path.join(process.cwd(), 'content/blog/shop')

function getAllMarkdownFiles(dir: string): string[] {
  const files: string[] = []

  if (!fs.existsSync(dir)) {
    return files
  }

  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      files.push(...getAllMarkdownFiles(fullPath))
    } else if (item.endsWith('.md') || item.endsWith('.mdx')) {
      files.push(fullPath)
    }
  }

  return files
}

function slugFromFile(filePath: string): string {
  const relativePath = path.relative(path.join(process.cwd(), 'content/blog'), filePath)
  return normalizeInternalPath(`/${relativePath.replace(/\.mdx?$/, '').replace(/\\/g, '/')}`)
}

function normalizeTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.map(String)
  if (tags) return [String(tags)]
  return []
}

function normalizeSlug(slug: string): string {
  return normalizeInternalPath(slug)
}

export async function getShopPosts(): Promise<BlogPost[]> {
  return readShopPosts()
}

function readShopPosts(): BlogPost[] {
  try {
    const allFiles = getAllMarkdownFiles(shopPostsDirectory)
    const posts = allFiles
      .map(filePath => {
        try {
          const fileContents = fs.readFileSync(filePath, 'utf8')
          const { data } = matter(fileContents)
          const fileSlug = slugFromFile(filePath)
          const slug = normalizeSlug(data.slug || fileSlug)
          const description = data.excerpt || data.description || ''

          return {
            slug,
            title: data.title || path.basename(fileSlug),
            description,
            date: data.publishDate || data.date || new Date().toISOString(),
            author: data.author,
            tags: normalizeTags(data.tags),
            image: data.image
          }
        } catch (error) {
          console.error(`Error processing shop file ${filePath}:`, error)
          return null
        }
      })
      .filter(post => post !== null) as BlogPost[]

    return posts.sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime()
      if (dateDiff !== 0) return dateDiff
      return a.title.localeCompare(b.title)
    })
  } catch (error) {
    console.error('Error in getShopPosts:', error)
    return []
  }
}

/** How many shop posts `content/` holds, read now. For the build; pages use `getShopPostCount`. */
export function countShopPosts(): number {
  return readShopPosts().length
}

/**
 * How many shop posts there are. The Worker renders the HTML sitemap on request, where `content/`
 * can't be read, so next.config.ts inlines the count its build took (`SHOP_POST_COUNT`). `next
 * dev`, the static export and tests read the files.
 */
export async function getShopPostCount(): Promise<number> {
  const counted = process.env.SHOP_POST_COUNT
  if (counted !== undefined) return Number(counted)
  if (process.env.SITE_BUILD_OUTPUT === 'worker') {
    throw new Error('SHOP_POST_COUNT is not set: next.config.ts inlines it into the Worker build.')
  }
  return countShopPosts()
}

async function renderMarkdownToHtml(content: string): Promise<string> {
  const [{ remark }, { default: html }] = await Promise.all([
    import('remark'),
    import('remark-html')
  ])
  const processedContent = await remark().use(html).process(content)
  return processedContent.toString()
}

export async function getShopPost(slug: string): Promise<BlogPost | null> {
  const normalizedSlug = normalizeSlug(slug)

  try {
    const allFiles = getAllMarkdownFiles(shopPostsDirectory)

    for (const filePath of allFiles) {
      try {
        const fileContents = fs.readFileSync(filePath, 'utf8')
        const { data, content } = matter(fileContents)
        const fileSlug = slugFromFile(filePath)
        const postSlug = normalizeSlug(data.slug || fileSlug)

        if (postSlug !== normalizedSlug) {
          continue
        }

        const description = data.excerpt || data.description || ''

        return {
          slug: postSlug,
          title: data.title || path.basename(fileSlug),
          description,
          date: data.publishDate || data.date || new Date().toISOString(),
          author: data.author,
          tags: normalizeTags(data.tags),
          image: data.image,
          content: await renderMarkdownToHtml(content)
        }
      } catch (error) {
        console.error(`Error processing shop file ${filePath}:`, error)
      }
    }

    return null
  } catch (error) {
    console.error('Error in getShopPost:', error)
    return null
  }
}

export async function getShopSlugs(): Promise<string[]> {
  const posts = await getShopPosts()
  return posts.map(post => post.slug)
}

export function getShopPageHref(page: number): string {
  return page <= 1 ? '/shop/' : `/shop/page/${page}/`
}

export const SHOP_PAGE_SIZE = BOXER_PAGE_SIZE
