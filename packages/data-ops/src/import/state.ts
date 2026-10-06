import { sqlLiteral } from './sql'

/**
 * The first thing an import runs: mark `dataset_state` as importing. A first import leaves
 * `version` null, so the Worker keeps answering 503 until it finishes; a re-import keeps the last
 * complete version, so pages stay up but nothing new is edge-cached until it finishes.
 */
export function buildImportStart(): string {
  return (
    'INSERT INTO dataset_state (id, importing) VALUES (1, 1)\n' +
    'ON CONFLICT (id) DO UPDATE SET importing = 1;\n'
  )
}

/**
 * The very last thing an import runs, once the row counts check out: record the version and clear
 * `importing`. `completed_at` changes only with the version, so re-importing the same data leaves
 * the row exactly as it was.
 */
export function buildImportComplete(version: string): string {
  const value = sqlLiteral(version)
  return (
    `INSERT INTO dataset_state (id, version, importing, completed_at) VALUES (1, ${value}, 0, CURRENT_TIMESTAMP)\n` +
    'ON CONFLICT (id) DO UPDATE SET importing = 0, version = excluded.version,\n' +
    '  completed_at = CASE WHEN dataset_state.version IS excluded.version\n' +
    '    THEN dataset_state.completed_at ELSE excluded.completed_at END;\n'
  )
}
