export function normalizeInternalPath(pathname: string): string {
  const input = pathname.trim()

  if (!input || input === '/') {
    return '/'
  }

  const queryIndex = input.indexOf('?')
  const hashIndex = input.indexOf('#')
  const suffixIndex = [queryIndex, hashIndex].filter(index => index >= 0).sort((a, b) => a - b)[0]
  const rawPath = suffixIndex === undefined ? input : input.slice(0, suffixIndex)
  const suffix = suffixIndex === undefined ? '' : input.slice(suffixIndex)
  const pathWithLeadingSlash = rawPath.startsWith('/') ? rawPath : `/${rawPath}`
  const pathWithoutTrailingSlash = pathWithLeadingSlash.replace(/\/+$/, '') || '/'

  if (pathWithoutTrailingSlash === '/') {
    return `/${suffix}`
  }

  const lastSegment = pathWithoutTrailingSlash.split('/').pop() || ''
  const isFilePath = /\.[A-Za-z0-9]+$/.test(lastSegment)
  const normalizedPath = isFilePath ? pathWithoutTrailingSlash : `${pathWithoutTrailingSlash}/`

  return `${normalizedPath}${suffix}`
}

export function toAbsoluteUrl(baseUrl: string, pathname: string): string {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '')
  const normalizedPath = normalizeInternalPath(pathname)

  if (normalizedPath === '/') {
    return normalizedBaseUrl
  }

  return `${normalizedBaseUrl}${normalizedPath}`
}
