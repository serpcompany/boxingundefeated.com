import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { normalizeInternalPath } from './url-utils'

export interface BlogPost {
  slug: string
  title: string
  description: string
  date: string
  author?: string
  tags?: string[]
  image?: string
  content?: string
}

const postsDirectory = path.join(process.cwd(), 'content/blog')
const shopPostsDirectory = path.join(postsDirectory, 'shop')

async function renderMarkdownToHtml(content: string): Promise<string> {
  const [{ remark }, { default: html }] = await Promise.all([
    import('remark'),
    import('remark-html')
  ])
  const processedContent = await remark().use(html).process(content)
  return processedContent.toString()
}

// Recursively get all markdown files from a directory
function getAllMarkdownFiles(dir: string): string[] {
  const files: string[] = []

  if (!fs.existsSync(dir)) {
    return files
  }

  const items = fs.readdirSync(dir)

  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      if (path.resolve(fullPath) === path.resolve(shopPostsDirectory)) {
        continue
      }

      // Recursively get files from subdirectory
      files.push(...getAllMarkdownFiles(fullPath))
    } else if (item.endsWith('.md') || item.endsWith('.mdx')) {
      files.push(fullPath)
    }
  }

  return files
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const allFiles = getAllMarkdownFiles(postsDirectory)

    // Limit the number of posts to prevent memory issues
    // You can paginate later if needed
    const limitedFiles = allFiles.slice(0, 50) // Show only first 50 posts for now

    const allPostsData = await Promise.all(
      limitedFiles.map(async filePath => {
        try {
          const fileContents = fs.readFileSync(filePath, 'utf8')
          const { data } = matter(fileContents)

          // Get relative path and use as default slug
          const relativePath = path.relative(postsDirectory, filePath)
          const fileSlug = normalizeInternalPath(
            `/${relativePath.replace(/\.mdx?$/, '').replace(/\\/g, '/')}`
          )

          // Use frontmatter slug if available, otherwise use file path
          const slug = normalizeInternalPath(data.slug || fileSlug)

          // Use excerpt if available, otherwise use description
          const description = data.excerpt || data.description || ''

          return {
            slug,
            title: data.title || path.basename(fileSlug),
            description: description,
            date: data.publishDate || data.date || new Date().toISOString(),
            author: data.author,
            tags: Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [],
            image: data.image
          }
        } catch (error) {
          console.error(`Error processing file ${filePath}:`, error)
          return null
        }
      })
    )

    // Filter out any null results from errors
    const validPosts = allPostsData.filter(post => post !== null) as BlogPost[]

    // Sort posts by date
    return validPosts.sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      return dateB - dateA // Most recent first
    })
  } catch (error) {
    console.error('Error in getBlogPosts:', error)
    return []
  }
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const allFiles = getAllMarkdownFiles(postsDirectory)

    for (const filePath of allFiles) {
      try {
        const fileContents = fs.readFileSync(filePath, 'utf8')
        const { data, content } = matter(fileContents)

        // Get relative path and use as default slug
        const relativePath = path.relative(postsDirectory, filePath)
        const fileSlug = normalizeInternalPath(
          `/${relativePath.replace(/\.mdx?$/, '').replace(/\\/g, '/')}`
        )

        // Use frontmatter slug if available, otherwise use file path
        const postSlug = normalizeInternalPath(data.slug || fileSlug)

        if (postSlug === normalizeInternalPath(slug)) {
          const contentHtml = await renderMarkdownToHtml(content)

          // Use excerpt if available, otherwise use description
          const description = data.excerpt || data.description || ''

          return {
            slug: postSlug,
            title: data.title || path.basename(slug),
            description: description,
            date: data.publishDate || data.date || new Date().toISOString(),
            author: data.author,
            tags: Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [],
            image: data.image,
            content: contentHtml
          }
        }
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error)
      }
    }

    return null
  } catch (error) {
    console.error('Error in getBlogPost:', error)
    return null
  }
}

export async function getBlogSlugs(): Promise<string[]> {
  try {
    const allFiles = getAllMarkdownFiles(postsDirectory)

    // Limit for static generation
    const limitedFiles = allFiles.slice(0, 50)

    return limitedFiles
      .map(filePath => {
        try {
          const fileContents = fs.readFileSync(filePath, 'utf8')
          const { data } = matter(fileContents)

          // Get relative path and use as default slug
          const relativePath = path.relative(postsDirectory, filePath)
          const fileSlug = normalizeInternalPath(
            `/${relativePath.replace(/\.mdx?$/, '').replace(/\\/g, '/')}`
          )

          // Use frontmatter slug if available, otherwise use file path
          const slug = normalizeInternalPath(data.slug || fileSlug)

          return slug
        } catch (error) {
          console.error(`Error processing file ${filePath}:`, error)
          return null
        }
      })
      .filter(slug => slug !== null) as string[]
  } catch (error) {
    console.error('Error in getBlogSlugs:', error)
    return []
  }
}
