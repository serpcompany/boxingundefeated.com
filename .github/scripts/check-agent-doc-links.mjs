// Fails when a doc under docs/agents/ isn't linked from AGENTS.md, or a relative link in AGENTS.md
// points to a file that doesn't exist. Agents find a leaf only through a map that links it (SERP
// Docs Are Maps, "Link every leaf from a map"). Run from the repository root; the Agent Docs
// workflow runs it next to check-agent-docs.mjs, which holds the size budgets.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { posix } from 'node:path'

const MAP = 'AGENTS.md'
const LEAVES = ':(glob)docs/agents/**/*.md'

const leaves = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '--', LEAVES],
  { encoding: 'utf8' }
)
  .split('\n')
  .filter(path => path && existsSync(path))

// Inline links `[text](target "title")` and reference definitions `[label]: target`.
const map = readFileSync(MAP, 'utf8')
const targets = [
  ...map.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g),
  ...map.matchAll(/^\s*\[[^\]]+\]:\s*<?([^\s>]+)>?/gm)
].map(match => match[1])

// Relative links only: no scheme, no bare `#anchor`. Paths resolve from the repository root.
const linked = new Set(
  targets
    .filter(target => !/^[a-z][a-z\d+.-]*:/i.test(target) && !target.startsWith('#'))
    .map(target => posix.normalize(decodeURIComponent(target.split(/[?#]/)[0]).replace(/^\//, '')))
)

const failures = [
  ...[...linked]
    .filter(path => !existsSync(path))
    .map(path => `${MAP} links to ${path}, which doesn't exist. Fix or drop the link.`),
  ...leaves
    .filter(leaf => !linked.has(leaf))
    .map(
      leaf =>
        `${leaf}: no link from ${MAP}. Link it from the map entry for its topic, or delete it.`
    )
]

if (failures.length > 0) {
  for (const failure of failures) console.error(failure)
  process.exit(1)
}

console.log(`${leaves.length} docs/agents leaves, each linked from ${MAP}.`)
