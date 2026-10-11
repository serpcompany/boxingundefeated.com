/**
 * Pins a pipeline `boxers.json` in R2 as an artifact version and prints the version, which
 * `.github/workflows/d1-import.yml` takes to import it (scripts/d1/artifact.ts).
 *
 * Usage:
 *   pnpm db:upload-artifact -- --target staging [--source <boxers.json>]
 *   pnpm db:upload-artifact -- --target local [--source <boxers.json>]   # Wrangler's local R2
 *   pnpm db:upload-artifact -- --target production --confirm-production --source <boxers.json>
 *                              # only the production job of d1-import.yml, after the owner approved
 *
 * The source defaults like `db:import`'s: $BOXERS_SOURCE, then from-pipeline/boxers.json. It must
 * pass the importer's validation, and outside local it may not be the d1/fixtures/ test data. The
 * version is its SHA-256. A key is never overwritten: the same content makes the upload a no-op,
 * other content is refused. A new object is read back and checked before the version is printed.
 */
import { mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative, resolve } from 'node:path'
import {
  checkProductionSourcePath,
  parseFlags,
  resolveTarget,
  TARGET_FLAGS
} from '../../packages/data-ops/src/import'
import { ARTIFACT_BUCKETS, artifactKey, fetchArtifact, putArtifact, sha256File } from './artifact'
import { loadDataset, resolveSource } from './import-boxers'
import { REPO_ROOT } from './wrangler'

const number = (value: number) => value.toLocaleString('en-US')
/** A path relative to the working directory when it is inside it. */
const shown = (path: string) => {
  const inside = relative(process.cwd(), path)
  return inside && !inside.startsWith('..') && !isAbsolute(inside) ? inside : path
}

function main(): void {
  const flags = parseFlags(process.argv.slice(2), [...TARGET_FLAGS, 'source'])
  const target = resolveTarget(flags).name
  const source = resolveSource(flags.source)
  if (target === 'production') {
    checkProductionSourcePath(typeof flags.source === 'string' ? source : undefined, REPO_ROOT)
  }
  const fromFixtures = relative(resolve(REPO_ROOT, 'd1/fixtures'), source)
  if (target !== 'local' && !fromFixtures.startsWith('..') && !isAbsolute(fromFixtures)) {
    throw new Error(`Refusing ${source}: d1/fixtures/ is test data, not pipeline output.`)
  }

  const dataset = loadDataset(source)
  const version = sha256File(source)
  const object = `${ARTIFACT_BUCKETS[target]}/${artifactKey(version)}`
  console.log(
    `Validated ${shown(source)}: ${number(statSync(source).size)} ` +
      `bytes, ${number(dataset.sourceCounts.boxers)} boxers, ${number(dataset.sourceCounts.bouts)} ` +
      `bouts, sha256 ${version}.`
  )

  const scratch = mkdtempSync(join(tmpdir(), 'boxers-artifact-'))
  try {
    let existing: number | null
    try {
      existing = fetchArtifact(target, version, join(scratch, 'existing.json'))
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new Error(`Refusing to upload: a pinned artifact is never overwritten.\n${reason}`)
    }
    if (existing !== null) {
      console.log(`${object} already holds this file (sha256 checked): nothing to upload.`)
    } else {
      putArtifact(target, version, source)
      const readBack = fetchArtifact(target, version, join(scratch, 'read-back.json'))
      if (readBack === null)
        throw new Error(`Uploaded ${object}, but reading it back found nothing.`)
      console.log(
        `Uploaded ${object} (${number(readBack)} bytes) and read it back: sha256 matches.`
      )
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
  console.log(`Version: ${version}`)
}

if (import.meta.filename === resolve(process.argv[1] ?? '')) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
