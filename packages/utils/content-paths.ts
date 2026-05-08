import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Get the monorepo root path
function getMonorepoRoot(): string {
  // Start from the current file's directory
  let currentDir = path.dirname(fileURLToPath(import.meta.url))

  // Go up until we find the monorepo root.
  while (!fs.existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) {
    const parent = path.dirname(currentDir)
    if (parent === currentDir) {
      throw new Error('Could not find monorepo root')
    }
    currentDir = parent
  }

  return currentDir
}

const MONOREPO_ROOT = getMonorepoRoot()

export function getContentPath(contentType: 'resources' | 'websites'): string {
  return path.join(MONOREPO_ROOT, 'content', contentType)
}

export function getContentFilePath(
  contentType: 'resources' | 'websites',
  fileName: string
): string {
  return path.join(getContentPath(contentType), fileName)
}
