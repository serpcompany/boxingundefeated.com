# Boxing Undefeated

A comprehensive boxing database and directory featuring 4,500+ professional boxers with detailed statistics and fight histories.

Agents and contributors: start with [AGENTS.md](AGENTS.md) for the repository map, commands and workflow.

## Tech Stack

- **Framework**: Next.js 16 and React 19 (static export, built with Turbopack)
- **Styling**: Tailwind CSS 4
- **Monorepo**: Turbo
- **Deployment**: Cloudflare Workers (OpenNext) with D1; see AGENTS.md

## Project Structure

```
├── apps/
│   └── web/                      # Main Next.js application
│       ├── app/                  # App router pages
│       ├── components/           # React components
│       ├── content/              # MDX content (blog, legal)
│       ├── data/                 # Source data
│       │   └── boxers.json       # Main boxer database (72MB)
│       ├── lib/                  # Application utilities
│       │   ├── blog-loader.ts   # Blog content loading
│       │   ├── boxers-loader.ts # Boxer data loading
│       │   └── routes.ts        # Route definitions
│       ├── public/
│       │   ├── data/boxers/     # Individual boxer JSON files (4,500+)
│       │   └── images/boxers/   # Boxer profile images
│       └── scripts/              # Web-specific build scripts
│           ├── generate-boxer-search.ts
│           └── generate-search.ts
│
├── packages/                     # Shared packages
│   ├── design-system/           # UI components library
│   │   └── lib/                 # Component utilities
│   └── utils/                   # Shared utility functions
│
├── configs/                      # Shared configurations
│   ├── next/                    # Next.js config
│   └── typescript/              # TypeScript config
│
└── scripts/                      # Root-level build & data scripts
    ├── split-boxer-data.js      # Splits main JSON into individual files
    ├── download-and-update-boxer-images.js  # Image processing
    └── validate-boxer-data.js   # Validates pipeline boxer data
```

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build
```

## Build Process

The build automatically:
1. Generates static HTML for all boxer pages
2. Creates search indexes
3. Exports to `apps/web/out/` for deployment

## Data Structure

- **Source**: Single `boxers.json` (72MB) with all boxer data
- **Build Output**: Individual JSON files per boxer for optimal loading
- **Search**: Pre-built search indexes for fast client-side search
- **Images**: Boxer profile images served from `/images/boxers/`

## Folder Organization

### Data Folders
- `apps/web/data/` - Source data files (main boxers.json)
- `apps/web/public/data/` - Individual boxer JSON files for web serving
- `apps/web/out/data/` - Build output (gitignored)

### Script Folders
- `/scripts/` - Root-level build and data processing scripts
- `apps/web/scripts/` - Web application-specific generation scripts
- `apps/web/lib/` - Application runtime utilities and loaders

### Package Libraries
- `packages/*/lib/` - Package-specific utility functions

## Recent Cleanup (Issue #15)

Removed redundancies from template conversion:
- Consolidated all images to `apps/web/public/images/`
- Removed empty `.codersinflow` template folder
- Removed duplicate root `/images` folder
- Cleaned up unused scripts
- Added `.swc` cache to gitignore