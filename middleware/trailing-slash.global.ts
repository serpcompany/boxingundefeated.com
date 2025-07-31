export default defineNuxtRouteMiddleware((to) => {
  // Skip if already has trailing slash or is an exception
  if (to.path.endsWith('/')) return
  
  // Exception: robots.txt and any .xml files (sitemaps)
  if (to.path === '/robots.txt' || to.path.endsWith('.xml')) return
  
  // Exception: files with extensions (images, css, js, etc.)
  if (to.path.includes('.') && !to.path.includes('?')) return
  
  // Redirect to URL with trailing slash
  return navigateTo(to.path + '/', { redirectCode: 301 })
})