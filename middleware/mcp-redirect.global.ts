/**
 * Global middleware to handle legacy /mcp route redirects.
 *
 * This middleware catches requests to legacy MCP routes and redirects them
 * to the homepage while preserving /mcp/servers/* routes.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // Redirect /mcp to homepage (which is now the MCP servers page)
  if (to.path === '/mcp') {
    return navigateTo('/', { redirectCode: 301 })
  }
  // Redirect /mcp/servers to homepage since it's now the homepage
  if (to.path === '/mcp/servers') {
    return navigateTo('/', { redirectCode: 301 })
  }
})
