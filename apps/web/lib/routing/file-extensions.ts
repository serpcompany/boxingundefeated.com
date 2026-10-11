/**
 * The extensions that make a URL path a file rather than a page (SERP URL trailing-slash
 * standard, "What counts as a file"): files never end with a slash, pages always do.
 *
 * "Contains a dot" doesn't mean "is a file": a slug such as `2.7-l` or `16.9-oz` is a page. Only
 * a last segment ending in one of these is a file. None of them is a top-level domain; never add
 * one that is (`.zip`, `.mov`, `.md`, `.app`, ...). No page slug may end in one of them: boxer
 * slugs are `[a-z0-9-]` (the importer's SLUG_PATTERN), and division slugs are fixed.
 */
export const FILE_EXTENSIONS: readonly string[] = [
  'atom',
  'avif',
  'css',
  'csv',
  'eot',
  'gif',
  'htm',
  'html',
  'ico',
  'jpeg',
  'jpg',
  'js',
  'json',
  'map',
  'mjs',
  'mp3',
  'mp4',
  'otf',
  'pdf',
  'png',
  'rss',
  'svg',
  'ttf',
  'txt',
  'wasm',
  'webm',
  'webmanifest',
  'webp',
  'woff',
  'woff2',
  'xml'
]

const EXTENSIONS = new Set(FILE_EXTENSIONS)

/** True when a path segment or slug ends in one of `FILE_EXTENSIONS`, in any case. */
export function hasFileExtension(name: string): boolean {
  const extension = /\.([a-z0-9]+)$/i.exec(name)?.[1]
  return extension !== undefined && EXTENSIONS.has(extension.toLowerCase())
}

/**
 * `FILE_EXTENSIONS` as a case-insensitive regex alternation that needs no `i` flag: OpenNext
 * tests redirect patterns case-sensitively, Next.js case-insensitively.
 */
export const FILE_EXTENSION_PATTERN = `(?:${FILE_EXTENSIONS.map(extension =>
  extension.replace(/[a-z]/g, letter => `[${letter.toUpperCase()}${letter}]`)
).join('|')})`
