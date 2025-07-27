export interface MCP {
  id: string
  slug: string
  name: string
  description: string
  author: string
  icon: string
  tags: string[]
  category: MCPCategory
  compatibility: string[]
  views: number
  copies: number
  likes: number
  githubUrl: string
  documentation: string
  createdAt: string
  updatedAt: string
  prompt?: string
  howToUse?: string[]
  examples?: string[]
  whatToExpect?: string[]
  tips?: string[]
}

export type MCPCategory =
  | 'Database'
  | 'Web Scraping'
  | 'Analysis'
  | 'Automation'
  | 'Communication'
  | 'Development'
  | 'Productivity'
  | 'AI/ML'
  | 'Security'
  | 'Monitoring'
  | 'Other'

export interface MCPFilters {
  categories: MCPCategory[]
  compatibility: string[]
  search: string
  sortBy: MCPSortOption
}

export type MCPSortOption =
  | 'name'
  | 'views'
  | 'copies'
  | 'likes'
  | 'updated'
  | 'created'

export interface MCPSort {
  field: MCPSortOption
  direction: 'asc' | 'desc'
}

export interface MCPPagination {
  currentPage: number
  itemsPerPage: number
  totalItems: number
  totalPages: number
}

export type MCPViewMode = 'grid' | 'list'

export interface MCPCardProps {
  mcp: MCP
  viewMode?: MCPViewMode
}

export interface MCPGridProps {
  mcps: MCP[]
  viewMode?: MCPViewMode
  loading?: boolean
}

export interface MCPFiltersProps {
  filters: MCPFilters
  availableCategories: MCPCategory[]
  availableCompatibility: string[]
}

export const MCP_CATEGORIES: MCPCategory[] = [
  'Database',
  'Web Scraping',
  'Analysis',
  'Automation',
  'Communication',
  'Development',
  'Productivity',
  'AI/ML',
  'Security',
  'Monitoring',
  'Other',
]

export const MCP_COMPATIBILITY_OPTIONS = [
  'Claude',
  'GPT-4',
  'GPT-3.5',
  'Local Models',
  'OpenAI API',
  'Anthropic API',
  'Custom APIs',
]

export const MCP_SORT_OPTIONS: { label: string, value: MCPSortOption }[] = [
  { label: 'Name (A-Z)', value: 'name' },
  { label: 'Most Views', value: 'views' },
  { label: 'Most Copies', value: 'copies' },
  { label: 'Most Likes', value: 'likes' },
  { label: 'Recently Updated', value: 'updated' },
  { label: 'Recently Created', value: 'created' },
]
