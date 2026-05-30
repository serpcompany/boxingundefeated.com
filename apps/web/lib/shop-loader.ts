import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import type { BlogPost } from './blog-loader'
import { BOXER_PAGE_SIZE } from './directory-pagination'

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
  return `/${relativePath.replace(/\.mdx?$/, '').replace(/\\/g, '/')}/`
}

function normalizeTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.map(String)
  if (tags) return [String(tags)]
  return []
}

function normalizeSlug(slug: string): string {
  const withLeadingSlash = slug.startsWith('/') ? slug : `/${slug}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

export async function getShopPosts(): Promise<BlogPost[]> {
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

export async function getShopSlugs(): Promise<string[]> {
  const posts = await getShopPosts()
  return posts.map(post => post.slug)
}

export function getShopPageHref(page: number): string {
  return page <= 1 ? '/shop' : `/shop/page/${page}`
}

export const SHOP_PAGE_SIZE = BOXER_PAGE_SIZE
