// biome-ignore-all lint/suspicious/noTemplateCurlyInString: the examples are source text to parse.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

// Two AGENTS.md rules, held by parsing every source file of the app instead of by agents
// remembering them (serp "Encode Lessons in Structure"). Tests, type declarations, `public/` and
// build output aren't scanned: tests assert on the origins the app renders.
//
// One environment resolver: only lib/site-config.ts reads `process.env.SITE_ENVIRONMENT` or writes
// an origin, so canonicals, robots, sitemaps and GTM can't disagree. Exceptions:
// scripts/write-build-environment.ts reads the variable to hand it to site-config's resolver; the
// Worker's `env.SITE_ENVIRONMENT` binding goes through `parseSiteEnvironment`; apps/e2e checks the
// site from outside, so it keeps its own expected origins.
//
// The app never writes SQL: every query lives in packages/data-ops/src/queries.ts. Biome bans
// `drizzle-orm` imports in apps/web (biome.json); this test holds the rest. A data-ops handle
// (`createDatabase()`, `getDatabase()`) goes straight into a function imported from data-ops, and
// only lib/data/database.ts returns one (from `getDatabase`); nothing calls the D1 binding's
// statement API; no string holds SQL.
const WEB_ROOT = join(__dirname, '..')
const SITE_CONFIG = 'lib/site-config.ts'
const ENVIRONMENT_READERS = new Set([SITE_CONFIG, 'scripts/write-build-environment.ts'])
const HANDLE_PROVIDER = 'lib/data/database.ts'
const DATA_OPS = '@boxingundefeated/data-ops'

const SOURCE_FILE = /\.[cm]?[jt]sx?$/
const NOT_SOURCE = /\.(test|spec|d)\.[cm]?[jt]sx?$/
const SKIPPED_DIRECTORIES = new Set(['node_modules', 'public', 'coverage'])

// The site's own origins and the local ones, anywhere in a string.
const ORIGIN_LITERAL =
  /\bhttps?:\/\/(?:(?:[a-z0-9-]+\.)*boxingundefeated\.com(?![\w-])|localhost\b|127\.0\.0\.1\b|\[::1\])/i
// The start of a SQL statement. A plain "select" counts only in capitals or before `*`, `count(`
// or `distinct`, so "Select a boxer from…" stays prose.
const SQL_TEXT = [
  /^\s*SELECT\s/,
  /^\s*select\s+(?:\*|count\(|distinct\s)/i,
  /^\s*(?:(?:insert|replace)\s+(?:or\s+\w+\s+)?into|update\s+\S+\s+set|delete\s+from|(?:create|drop|alter)\s+(?:table|index|view|trigger)|pragma)\s/i
]
// The D1 binding's statement API. `exec` counts only on the binding, since RegExp has one too.
const D1_STATEMENT_METHODS = new Set(['prepare', 'batch', 'dump', 'withSession'])
const D1_BINDING = /(?:^|\.)DB$|\$client$/
const HANDLE_FACTORIES = new Set(['createDatabase', 'getDatabase'])

interface Source {
  file: string
  nodes: ts.Node[]
  at: (node: ts.Node) => string
}

function sourceFiles(directory = ''): string[] {
  return readdirSync(join(WEB_ROOT, directory), { withFileTypes: true }).flatMap(entry => {
    const path = directory ? `${directory}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      const skipped = entry.name.startsWith('.') || SKIPPED_DIRECTORIES.has(entry.name)
      return skipped ? [] : sourceFiles(path)
    }
    return SOURCE_FILE.test(entry.name) && !NOT_SOURCE.test(entry.name) ? [path] : []
  })
}

function parse(file: string, text = readFileSync(join(WEB_ROOT, file), 'utf8')): Source {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
  const nodes: ts.Node[] = []
  const visit = (node: ts.Node) => {
    nodes.push(node)
    ts.forEachChild(node, visit)
  }
  visit(source)
  const at = (node: ts.Node) =>
    `apps/web/${file}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`
  return { file, nodes, at }
}

const textOf = (node: ts.Node) => node.getText().replace(/\s+/g, '')

const isProcessEnv = (node: ts.Node) =>
  ['process.env', 'globalThis.process.env'].includes(textOf(node))

function readsSiteEnvironment(node: ts.Node): boolean {
  if (ts.isPropertyAccessExpression(node)) {
    return node.name.text === 'SITE_ENVIRONMENT' && isProcessEnv(node.expression)
  }
  if (ts.isElementAccessExpression(node)) {
    const key = node.argumentExpression
    return (
      ts.isStringLiteralLike(key) &&
      key.text === 'SITE_ENVIRONMENT' &&
      isProcessEnv(node.expression)
    )
  }
  if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name) && node.initializer) {
    return (
      isProcessEnv(node.initializer) &&
      node.name.elements.some(
        element => (element.propertyName ?? element.name).getText() === 'SITE_ENVIRONMENT'
      )
    )
  }
  return false
}

/** The text of a string literal or of one part of a template literal. */
function literalText(node: ts.Node): string | null {
  const literal =
    ts.isStringLiteralLike(node) ||
    ts.isTemplateHead(node) ||
    ts.isTemplateMiddle(node) ||
    ts.isTemplateTail(node)
  return literal ? node.text : null
}

function buildsOrigin(node: ts.Node): boolean {
  const text = ts.isJsxText(node) ? node.text : literalText(node)
  if (text === null) return false
  if (ORIGIN_LITERAL.test(text)) return true
  // A scheme joined to a value: `https://${host}`, `${protocol}//${host}` or 'https://' + host.
  if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node)) return /(?:^|:)\/\/$/.test(text)
  return ts.isStringLiteral(node) && /^https?:\/\/$/i.test(text)
}

function environmentViolations({ file, nodes, at }: Source): string[] {
  return nodes.flatMap(node => {
    if (!ENVIRONMENT_READERS.has(file) && readsSiteEnvironment(node)) {
      return [
        `${at(node)} reads process.env.SITE_ENVIRONMENT: use getSiteConfig() (${SITE_CONFIG})`
      ]
    }
    if (file !== SITE_CONFIG && buildsOrigin(node)) {
      return [
        `${at(node)} writes an origin: use getSiteOrigin() or siteOriginFor() (${SITE_CONFIG})`
      ]
    }
    return []
  })
}

/** The local names this file imports from data-ops. */
function dataOpsImports(nodes: ts.Node[]): Set<string> {
  return new Set(
    nodes
      .filter(ts.isImportDeclaration)
      .filter(node => (node.moduleSpecifier as ts.StringLiteral).text.startsWith(DATA_OPS))
      .flatMap(node => {
        const bindings = node.importClause?.namedBindings
        return bindings && ts.isNamedImports(bindings)
          ? bindings.elements.map(element => element.name.text)
          : []
      })
  )
}

/** True when a handle goes straight into a data-ops function, or getDatabase returns it. */
function handleIsPassedOn(call: ts.CallExpression, file: string, dataOps: Set<string>): boolean {
  let node: ts.Node = call
  while (
    ts.isAwaitExpression(node.parent) ||
    ts.isParenthesizedExpression(node.parent) ||
    ts.isAsExpression(node.parent) ||
    ts.isNonNullExpression(node.parent)
  ) {
    node = node.parent
  }
  const { parent } = node
  if (ts.isCallExpression(parent) && parent.arguments.includes(node as ts.Expression)) {
    return ts.isIdentifier(parent.expression) && dataOps.has(parent.expression.text)
  }
  const returned =
    ts.isReturnStatement(parent) || (ts.isArrowFunction(parent) && parent.body === node)
  return returned && file === HANDLE_PROVIDER
}

function sqlViolations({ file, nodes, at }: Source): string[] {
  const dataOps = dataOpsImports(nodes)
  return nodes.flatMap(node => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text
      const receiver = textOf(node.expression.expression)
      if (D1_STATEMENT_METHODS.has(method) || (method === 'exec' && D1_BINDING.test(receiver))) {
        return [`${at(node)} calls D1's ${method}(): add a query to packages/data-ops`]
      }
    }
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      HANDLE_FACTORIES.has(node.expression.text) &&
      !handleIsPassedOn(node, file, dataOps)
    ) {
      return [`${at(node)} keeps a ${node.expression.text}() handle: pass it to a data-ops query`]
    }
    if (ts.isPropertyAccessExpression(node) && node.name.text === '$client') {
      return [`${at(node)} reaches the raw D1 client: add a query to packages/data-ops`]
    }
    const text = ts.isTemplateMiddle(node) || ts.isTemplateTail(node) ? null : literalText(node)
    if (text !== null && SQL_TEXT.some(pattern => pattern.test(text))) {
      return [`${at(node)} holds SQL: add the query to packages/data-ops/src/queries.ts`]
    }
    return []
  })
}

const sources = sourceFiles().map(file => parse(file))
const lines = (file: string, numbers: number[]) => numbers.map(line => `apps/web/${file}:${line}`)
const locations = (violations: string[]) => violations.map(violation => violation.split(' ')[0])

describe('the scanned sources', () => {
  it('include the pages, components, lib, scripts and the Worker entry', () => {
    expect(sources.map(source => source.file)).toEqual(
      expect.arrayContaining([
        'app/page.tsx',
        'components/layout/footer.tsx',
        SITE_CONFIG,
        HANDLE_PROVIDER,
        'lib/worker/handle-request.ts',
        'scripts/write-build-environment.ts',
        'worker.ts',
        'next.config.ts'
      ])
    )
  })
})

describe('one environment resolver', () => {
  it('only lib/site-config.ts reads SITE_ENVIRONMENT from process.env or writes an origin', () => {
    expect(sources.flatMap(environmentViolations)).toEqual([])
  })

  it('catches reads of the variable and written origins', () => {
    const example = [
      'const a = process.env.SITE_ENVIRONMENT',
      "const b = process.env['SITE_ENVIRONMENT']",
      'const { SITE_ENVIRONMENT } = process.env',
      "const c = 'https://staging.boxingundefeated.com/boxers/'",
      'const d = `http://localhost:${port}`',
      'const e = `https://${host}`',
      'const f = `${url.protocol}//${url.host}`',
      "const g = 'https://' + host",
      "const h = 'https://github.com/serpcompany/boxingundefeated.com/issues'",
      'const i = process.env.ANALYZE',
      "const j = path.replace('//', '/')"
    ].join('\n')
    expect(locations(environmentViolations(parse('lib/example.ts', example)))).toEqual(
      lines('lib/example.ts', [1, 2, 3, 4, 5, 6, 7, 8])
    )
  })
})

describe('the app never writes SQL', () => {
  it('reaches D1 only through data-ops queries', () => {
    expect(sources.flatMap(sqlViolations)).toEqual([])
  })

  it('catches D1 statements, a handle used directly and SQL text', () => {
    const example = [
      "import { createDatabase, searchBoxers } from '@boxingundefeated/data-ops'",
      "env.DB.prepare('x')",
      'env.DB.exec(text)',
      'await env.DB.batch([])',
      'createDatabase(env.DB).select()',
      'const db = createDatabase(env.DB)',
      'helper(createDatabase(env.DB))',
      'db.$client.dump()',
      "const q = 'DELETE FROM boxers'",
      'const r = `select * from bouts where id = ${id}`',
      'searchBoxers(createDatabase(env.DB), query)',
      '/^a+$/.exec(text)',
      "const s = 'Select a boxer from the list'"
    ].join('\n')
    expect(locations(sqlViolations(parse('lib/worker/example.ts', example)))).toEqual(
      lines('lib/worker/example.ts', [2, 3, 4, 5, 6, 7, 8, 8, 9, 10])
    )
  })
})
