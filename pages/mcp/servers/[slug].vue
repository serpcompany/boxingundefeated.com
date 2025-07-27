<script setup lang="ts">
/**
 * MCP Detail Page.
 *
 * Displays comprehensive information about a specific MCP tool including
 * description, metrics, usage examples, actions, and documentation links.
 * Follows TDD methodology with TypeScript and TSDoc documentation.
 *
 * @component
 * @example
 * ```vue
 * <!-- Accessed via /mcp/servers/brave-search -->
 * ```
 */

import type { MCP } from '~/types/Mcp'

/**
 * Fetch MCP data from the collection data.
 * @param slug - The MCP slug identifier.
 * @returns Promise containing MCP data.
 */
async function fetchMCPData(slug: string): Promise<MCP> {
  // Import the mock data from our collection
  const { mockMCPTools } = await import('~/data/mcp-tools')

  // Find the MCP tool by slug
  const mcp = mockMCPTools.find(tool => tool.slug === slug)

  if (!mcp) {
    throw new Error(`MCP tool with ID "${slug}" not found`)
  }

  return mcp
}

// Get route parameter
const route = useRoute()
const slug = route.params.slug as string

// Reactive state for loading and data
const pending = ref(false)
const error = ref(false)
const mcp = ref<MCP | null>(null)

// Fetch MCP data on mount
onMounted(async () => {
  try {
    pending.value = true
    mcp.value = await fetchMCPData(slug)
  }
  catch (err) {
    error.value = true
    console.error('Failed to fetch MCP data:', err)
  }
  finally {
    pending.value = false
  }
})

// For SSR and testing, fetch data immediately
if (import.meta.server || import.meta.env.NODE_ENV === 'test') {
  try {
    mcp.value = await fetchMCPData(slug)
  }
  catch {
    error.value = true
  }
}

/**
 * Format numbers with comma separators.
 * @param num - The number to format.
 * @returns Formatted number string.
 */
function formatNumber(num: number): string {
  return num.toLocaleString()
}

/**
 * Copy MCP information to clipboard.
 */
function copyToClipboard() {
  // Placeholder for copy functionality
  // TODO: Implement clipboard copy functionality
}
</script>

<template>
  <!-- Loading State -->
  <div
    v-if="pending"
    class="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center"
  >
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" />
      <p class="text-zinc-600 dark:text-zinc-400">
        Loading MCP details...
      </p>
    </div>
  </div>

  <!-- Error State -->
  <div
    v-else-if="error"
    class="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center"
  >
    <div class="text-center">
      <h1 class="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
        MCP Not Found
      </h1>
      <p class="text-zinc-600 dark:text-zinc-400 mb-4">
        The MCP tool "{{ slug }}" could not be found.
      </p>
      <NuxtLink to="/" class="text-green-600 hover:text-green-700 dark:text-green-400">
        ← Back to MCP Collection
      </NuxtLink>
    </div>
  </div>

  <!-- MCP Content -->
  <div v-else-if="mcp" class="mcp-detail-page">
    <!-- Page Header -->
    <div class="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
      <UContainer class="py-8">
        <div class="lg:grid lg:grid-cols-3 lg:gap-8">
          <!-- Main Header Content -->
          <div class="lg:col-span-2">
            <h1 class="text-3xl font-bold text-zinc-900 dark:text-white mb-3">
              {{ mcp.name }}
            </h1>
            <p class="text-lg text-zinc-600 dark:text-zinc-400 mb-6">
              {{ mcp.description }}
            </p>

            <!-- Tags -->
            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="tag in mcp.tags"
                :key="tag"
                :label="tag"
                variant="outline"
                size="sm"
              />
            </div>
          </div>

          <!-- Sidebar Info -->
          <div class="mt-8 lg:mt-0">
            <div
              class="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-5 space-y-4
                     border border-zinc-200 dark:border-zinc-700"
            >
              <div>
                <h3 class="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Provider
                </h3>
                <p class="text-base font-semibold text-zinc-900 dark:text-white">
                  {{ mcp.author }}
                </p>
              </div>

              <div>
                <h3 class="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Category
                </h3>
                <UBadge :label="mcp.category" variant="soft" size="sm" />
              </div>

              <div>
                <h3 class="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Language
                </h3>
                <p class="text-base text-zinc-900 dark:text-white">
                  TypeScript
                </p>
              </div>

              <div>
                <h3 class="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Stats
                </h3>
                <div class="space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-heroicons-eye" class="w-4 h-4" />
                    <span>{{ formatNumber(mcp.views) }} views</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <UIcon name="i-heroicons-heart" class="w-4 h-4" />
                    <span>{{ formatNumber(mcp.likes) }} likes</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <UIcon name="i-heroicons-document-duplicate" class="w-4 h-4" />
                    <span>{{ formatNumber(mcp.copies) }} copies</span>
                  </div>
                </div>
              </div>

              <UButton
                :to="mcp.githubUrl"
                external
                target="_blank"
                variant="outline"
                class="w-full justify-center text-sm"
              >
                <UIcon name="i-heroicons-code-bracket" class="mr-2" />
                View on GitHub
              </UButton>
            </div>
          </div>
        </div>
      </UContainer>
    </div>

    <!-- Main Content -->
    <UContainer class="py-8">
      <div class="lg:grid lg:grid-cols-3 lg:gap-8">
        <!-- Main Content Column -->
        <div
          class="lg:col-span-2 prose prose-zinc dark:prose-invert max-w-none
                 prose-p:text-base prose-p:leading-relaxed prose-h2:text-2xl
                 prose-h2:font-bold prose-h3:text-xl prose-h3:font-semibold
                 prose-li:text-base prose-li:leading-relaxed"
        >
          <!-- Overview -->
          <p class="text-lg leading-7 text-zinc-600 dark:text-zinc-300 mb-6">
            The {{ mcp.name }} is a specialized server that allows Large Language Models to
            interact with databases and services through the Model Context Protocol. It provides
            standardized tools for reading, writing, and managing data, making it possible for AI
            models to directly work with external systems.
          </p>

          <!-- Prerequisites -->
          <h2>Prerequisites</h2>
          <p>Before installing the {{ mcp.name }}, ensure you have:</p>
          <ul>
            <li>Node.js 18+ installed on your system</li>
            <li>Access to the target service or database</li>
            <li>Proper authentication credentials if required</li>
          </ul>

          <!-- Installation -->
          <h2>Installation and Setup</h2>

          <h3>Using NPX</h3>
          <p>You can run the server using NPX:</p>
          <pre><code>npx {{ mcp.slug }}</code></pre>

          <h3>Integration with Claude Desktop</h3>
          <p>
            To use this server with the Claude Desktop app, add the following configuration
            to the "mcpServers" section of your <code>claude_desktop_config.json</code>:
          </p>

          <pre><code>{
  "mcpServers": {
    "{{ mcp.slug }}": {
      "command": "npx",
      "args": ["{{ mcp.slug }}"]
    }
  }
}</code></pre>

          <!-- Available Tools -->
          <h2>Available Tools</h2>
          <p>The {{ mcp.name }} provides the following tools:</p>

          <div class="space-y-4">
            <div
              v-for="(example, index) in mcp.examples"
              :key="index"
              class="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4"
            >
              <h4 class="text-base font-semibold mb-2">
                Tool {{ index + 1 }}
              </h4>
              <p class="text-sm text-zinc-600 dark:text-zinc-400">
                {{ example }}
              </p>
            </div>
          </div>

          <!-- How to Use -->
          <h2>How to Use</h2>
          <ol>
            <li v-for="(instruction, index) in mcp.howToUse" :key="index">
              {{ instruction }}
            </li>
          </ol>

          <!-- Troubleshooting -->
          <h2>Troubleshooting</h2>
          <h3>Connection Issues</h3>
          <ul>
            <li>Verify the service is running and accessible</li>
            <li>Check your authentication credentials</li>
            <li>Ensure network connectivity to the target service</li>
            <li>Review the server logs for detailed error messages</li>
          </ul>

          <!-- Integration with Cursor -->
          <h2>How to add this MCP server to Cursor</h2>
          <p>
            There are two ways to add an MCP server to Cursor. The most common way is to add
            the server globally in the <code>~/.cursor/mcp.json</code> file so that it is
            available in all of your projects.
          </p>

          <h3>Adding an MCP server to Cursor globally</h3>
          <p>
            To add a global MCP server go to Cursor Settings > MCP and click
            "Add new global MCP server".
          </p>
          <p>
            When you click that button the <code>~/.cursor/mcp.json</code> file will be opened
            and you can add your server like this:
          </p>

          <pre><code>{
    "mcpServers": {
        "{{ mcp.slug }}": {
            "command": "npx",
            "args": ["{{ mcp.slug }}"]
        }
    }
}</code></pre>

          <!-- Advanced Usage -->
          <h2>Advanced Usage and Configuration</h2>

          <h3>Environment Variables</h3>
          <p>The {{ mcp.name }} supports several environment variables for configuration:</p>
          <ul>
            <li>
              <code>API_TOKEN</code>: Your service API token
              (required for authenticated operations)
            </li>
            <li>
              <code>API_URL</code>: Base URL for the service API
              (optional, defaults to service default)
            </li>
            <li>
              <code>LOG_LEVEL</code>: Logging level (optional, defaults to 'info')
            </li>
            <li>
              <code>TIMEOUT</code>: Request timeout in milliseconds
              (optional, defaults to 30000)
            </li>
          </ul>

          <h3>Using with Docker</h3>
          <p>You can also run the server using Docker for better isolation:</p>
          <pre><code>docker run -i --rm \\
  -e API_TOKEN=your_token_here \\
  -e API_URL=https://api.service.com/v1 \\
  mcp/{{ mcp.slug }}</code></pre>

          <p>For Claude Desktop with Docker:</p>
          <pre><code>{
  "mcpServers": {
    "{{ mcp.slug }}": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-e",
        "API_TOKEN",
        "-e",
        "API_URL",
        "mcp/{{ mcp.slug }}"
      ],
      "env": {
        "API_TOKEN": "your_token_here",
        "API_URL": "https://api.service.com/v1"
      }
    }
  }
}</code></pre>

          <!-- Detailed Tool Reference -->
          <h2>Detailed Tool Reference</h2>

          <h3>File Operations</h3>

          <h4>create_or_update_file</h4>
          <p>Creates or updates a file in the repository.</p>
          <p><strong>Inputs:</strong></p>
          <ul>
            <li><code>project_id</code> (string): Project ID or URL-encoded path</li>
            <li><code>file_path</code> (string): Path where to create/update the file</li>
            <li><code>content</code> (string): Content of the file</li>
            <li><code>commit_message</code> (string): Commit message</li>
            <li><code>branch</code> (string): Branch to create/update the file in</li>
            <li><code>previous_path</code> (string, optional): Path of the file to move/rename</li>
          </ul>

          <h4>push_files</h4>
          <p>Pushes multiple files to a repository in a single commit.</p>
          <p><strong>Inputs:</strong></p>
          <ul>
            <li><code>project_id</code> (string): Project ID or URL-encoded path</li>
            <li><code>branch</code> (string): Branch to push to</li>
            <li>
              <code>files</code> (array): Array of files to push, each with file_path and content
            </li>
            <li><code>commit_message</code> (string): Commit message</li>
          </ul>

          <h4>get_file_contents</h4>
          <p>Retrieves the contents of a file or directory from the repository.</p>
          <p><strong>Inputs:</strong></p>
          <ul>
            <li><code>project_id</code> (string): Project ID or URL-encoded path</li>
            <li><code>file_path</code> (string): Path to file/directory</li>
            <li><code>ref</code> (string, optional): Branch/tag/commit to get contents from</li>
          </ul>

          <h3>Repository Management</h3>

          <h4>search_repositories</h4>
          <p>Searches for repositories based on query criteria.</p>
          <p><strong>Inputs:</strong></p>
          <ul>
            <li><code>search</code> (string): Search query</li>
            <li><code>page</code> (number, optional): Page number for pagination</li>
            <li><code>per_page</code> (number, optional): Results per page (default 20)</li>
          </ul>

          <h4>create_repository</h4>
          <p>Creates a new repository/project.</p>
          <p><strong>Inputs:</strong></p>
          <ul>
            <li><code>name</code> (string): Project name</li>
            <li><code>description</code> (string, optional): Project description</li>
            <li><code>visibility</code> (string, optional): 'private', 'internal', or 'public'</li>
            <li><code>initialize_with_readme</code> (boolean, optional): Initialize with README</li>
          </ul>

          <h4>fork_repository</h4>
          <p>Creates a fork of an existing repository.</p>
          <p><strong>Inputs:</strong></p>
          <ul>
            <li><code>project_id</code> (string): Project ID or URL-encoded path</li>
            <li><code>namespace</code> (string, optional): Namespace to fork to</li>
          </ul>

          <h4>create_branch</h4>
          <p>Creates a new branch in the repository.</p>
          <p><strong>Inputs:</strong></p>
          <ul>
            <li><code>project_id</code> (string): Project ID or URL-encoded path</li>
            <li><code>branch</code> (string): Name for new branch</li>
            <li><code>ref</code> (string, optional): Source branch/commit for new branch</li>
          </ul>

          <h3>Issue and Merge Request Management</h3>

          <h4>create_issue</h4>
          <p>Creates a new issue in the project.</p>
          <p><strong>Inputs:</strong></p>
          <ul>
            <li><code>project_id</code> (string): Project ID or URL-encoded path</li>
            <li><code>title</code> (string): Issue title</li>
            <li><code>description</code> (string, optional): Issue description</li>
            <li><code>assignee_ids</code> (array, optional): User IDs to assign</li>
            <li><code>labels</code> (array, optional): Labels to add</li>
            <li><code>milestone_id</code> (number, optional): Milestone ID</li>
          </ul>

          <h4>create_merge_request</h4>
          <p>Creates a new merge request in the project.</p>
          <p><strong>Inputs:</strong></p>
          <ul>
            <li><code>project_id</code> (string): Project ID or URL-encoded path</li>
            <li><code>title</code> (string): MR title</li>
            <li><code>description</code> (string, optional): MR description</li>
            <li><code>source_branch</code> (string): Branch containing changes</li>
            <li><code>target_branch</code> (string): Branch to merge into</li>
            <li><code>draft</code> (boolean, optional): Create as draft MR</li>
            <li>
              <code>allow_collaboration</code> (boolean, optional): Allow commits from
              upstream members
            </li>
          </ul>

          <!-- Authentication and Security -->
          <h2>Authentication and Security</h2>

          <h3>API Token Setup</h3>
          <p>
            To use this MCP server, you'll need to create an API token with appropriate
            permissions:
          </p>
          <ol>
            <li>Go to User Settings > Access Tokens in your service dashboard</li>
            <li>
              Select the required scopes:
              <ul>
                <li><code>api</code> for full API access</li>
                <li><code>read_api</code> for read-only access</li>
                <li>
                  <code>read_repository</code> and <code>write_repository</code> for
                  repository operations
                </li>
              </ul>
            </li>
            <li>Create the token and save it securely</li>
            <li>Never commit your token to version control</li>
          </ol>

          <h3>Security Best Practices</h3>
          <ul>
            <li>Store API tokens in environment variables, not in configuration files</li>
            <li>Use the principle of least privilege - only grant necessary permissions</li>
            <li>Regularly rotate your API tokens</li>
            <li>Monitor API usage and set up alerts for unusual activity</li>
            <li>Use HTTPS endpoints only</li>
          </ul>

          <!-- Advanced Troubleshooting -->
          <h2>Advanced Troubleshooting</h2>

          <h3>Common Error Codes</h3>

          <h4>401 Unauthorized</h4>
          <ul>
            <li>Check that your API token is valid and not expired</li>
            <li>Verify the token has the required permissions</li>
            <li>Ensure the token is properly set in environment variables</li>
          </ul>

          <h4>403 Forbidden</h4>
          <ul>
            <li>The token may lack sufficient permissions for the requested operation</li>
            <li>Check project/repository visibility settings</li>
            <li>Verify you have access to the specified project</li>
          </ul>

          <h4>404 Not Found</h4>
          <ul>
            <li>Verify the project ID or path is correct</li>
            <li>Check that the project exists and is accessible</li>
            <li>Ensure branch names and file paths are accurate</li>
          </ul>

          <h4>429 Rate Limited</h4>
          <ul>
            <li>Reduce the frequency of API calls</li>
            <li>Implement exponential backoff in your requests</li>
            <li>Consider upgrading your service plan for higher rate limits</li>
          </ul>

          <h3>Debugging Tips</h3>
          <ul>
            <li>Enable debug logging by setting <code>LOG_LEVEL=debug</code></li>
            <li>Use the service's API documentation to verify request formats</li>
            <li>Test API calls manually using curl or a REST client</li>
            <li>Check service status pages for ongoing issues</li>
            <li>Review server logs for detailed error messages</li>
          </ul>

          <!-- Performance and Best Practices -->
          <h2>Performance and Best Practices</h2>

          <h3>Optimization Tips</h3>
          <ul>
            <li>
              Use batch operations when possible (e.g., push_files instead of multiple
              create_or_update_file calls)
            </li>
            <li>Implement caching for frequently accessed data</li>
            <li>Use pagination for large result sets</li>
            <li>Minimize API calls by fetching only necessary data</li>
            <li>Use webhooks instead of polling for real-time updates</li>
          </ul>

          <h3>Usage Patterns</h3>
          <ul>
            <li>Group related operations into single API calls when possible</li>
            <li>Use meaningful commit messages and descriptions</li>
            <li>Follow semantic versioning for releases</li>
            <li>Implement proper error handling and retry logic</li>
            <li>Monitor API usage to stay within rate limits</li>
          </ul>

          <!-- Integration Examples -->
          <h2>Integration Examples</h2>

          <h3>Automated Code Review</h3>
          <p>Use the MCP server to automate code review processes:</p>
          <pre><code># Example: Create a merge request with automated checks
{
  "tool": "create_merge_request",
  "inputs": {
    "project_id": "my-project",
    "title": "Feature: Add user authentication",
    "description": "Implements JWT-based authentication system",
    "source_branch": "feature/auth",
    "target_branch": "main",
    "draft": false
  }
}</code></pre>

          <h3>Issue Management</h3>
          <p>Automate issue creation and tracking:</p>
          <pre><code># Example: Create an issue with labels and assignment
{
  "tool": "create_issue",
  "inputs": {
    "project_id": "my-project",
    "title": "Bug: Login form validation",
    "description": "The login form doesn't validate email format correctly",
    "labels": ["bug", "frontend", "high-priority"],
    "assignee_ids": [123]
  }
}</code></pre>

          <h3>Repository Setup</h3>
          <p>Automate repository creation and initial setup:</p>
          <pre><code># Example: Create a new project with README
{
  "tool": "create_repository",
  "inputs": {
    "name": "new-microservice",
    "description": "A new microservice for user management",
    "visibility": "private",
    "initialize_with_readme": true
  }
}</code></pre>
        </div>

        <!-- Sidebar -->
        <div class="mt-12 lg:mt-0">
          <div class="lg:sticky lg:top-16 space-y-6">
            <!-- Quick Actions -->
            <div
              class="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-5
                     border border-zinc-200 dark:border-zinc-700"
            >
              <h3 class="text-lg font-bold text-zinc-900 dark:text-white mb-4">
                Quick Actions
              </h3>
              <div class="space-y-3">
                <UButton
                  :to="mcp.documentation"
                  external
                  target="_blank"
                  variant="outline"
                  class="w-full justify-center text-sm"
                >
                  <UIcon name="i-heroicons-document-text" class="mr-2" />
                  Documentation
                </UButton>

                <UButton
                  variant="outline"
                  class="w-full justify-center text-sm"
                  @click="copyToClipboard"
                >
                  <UIcon name="i-heroicons-clipboard" class="mr-2" />
                  Copy Install Command
                </UButton>
              </div>
            </div>

            <!-- Compatible With -->
            <div
              class="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-5
                     border border-zinc-200 dark:border-zinc-700"
            >
              <h3 class="text-lg font-bold text-zinc-900 dark:text-white mb-4">
                Compatible with
              </h3>
              <div class="space-y-2">
                <div
                  v-for="compat in mcp.compatibility"
                  :key="compat"
                  class="flex items-center gap-2 text-sm text-zinc-600
                         dark:text-zinc-300 leading-relaxed"
                >
                  <UIcon name="i-heroicons-check" class="w-4 h-4 text-green-600" />
                  {{ compat }}
                </div>
              </div>
            </div>

            <!-- Related -->
            <div
              class="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-5
                     border border-zinc-200 dark:border-zinc-700"
            >
              <h3 class="text-lg font-bold text-zinc-900 dark:text-white mb-4">
                Related Servers
              </h3>
              <p class="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                Explore more {{ mcp.category }} MCP servers
              </p>
              <UButton
                to="/"
                variant="ghost"
                size="sm"
                class="mt-3 w-full justify-center text-sm"
              >
                Browse {{ mcp.category }} servers
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<style scoped>
.mcp-detail-page {
  @apply min-h-screen bg-zinc-50 dark:bg-zinc-900;
}
</style>
