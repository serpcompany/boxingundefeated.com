#!/usr/bin/env node
/**
 * Sync staging (libsql) -> local Miniflare D1 SQLite using Node's built-in `node:sqlite`.
 * 
 * Runs on Node 22.x with: node --experimental-sqlite --import tsx scripts/sync-miniflare-with-staging.ts
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { DatabaseSync } from "node:sqlite";
import { createClient, type Client } from "@libsql/client";

await (process as any).loadEnvFile?.();

const PAGE_SIZE = Number(process.env.D1_SYNC_PAGE_SIZE || 500);
const TABLES = ["boxers", "divisions", "bouts"] as const;

function findMiniflareDb(): string {
    const d1Dir = path.join(process.cwd(), ".data", "hub", "d1", "miniflare-D1DatabaseObject");
    if (!fs.existsSync(d1Dir) || !fs.statSync(d1Dir).isDirectory()) {
        console.error(`Error: Expected Miniflare D1 dir at ${d1Dir} (run from your project root).`);
        process.exit(1);
    }
    const candidates = fs
        .readdirSync(d1Dir, { withFileTypes: true })
        .filter((d) => d.isFile() && d.name.endsWith(".sqlite"))
        .map((d) => path.join(d1Dir, d.name));
    if (candidates.length === 0) {
        console.error(`Error: No ".sqlite" file found in ${d1Dir}`);
        process.exit(1);
    }
    if (candidates.length === 1) return candidates[0];
    const sorted = candidates
        .map((p) => ({ p, mtimeMs: fs.statSync(p).mtimeMs }))
        .sort((a, b) => b.mtimeMs - a.mtimeMs);
    console.log(`Multiple .sqlite files found. Using most recent: ${path.basename(sorted[0].p)}`);
    return sorted[0].p;
}

function getStagingClient(): Client {
    const url = process.env.LIBSQL_CONNECTION_URL;
    const authToken = process.env.LIBSQL_AUTH_TOKEN;
    if (!url) {
        console.error("Error: LIBSQL_CONNECTION_URL is not set.");
        process.exit(1);
    }
    return createClient({ url, authToken });
}

type ColInfo = { columns: string[]; selectList: string };
async function getColumnInfo(client: Client, table: string): Promise<ColInfo> {
    const pragma = await client.execute(`PRAGMA table_info(\`${table}\`)`);
    const columns = (pragma.rows || []).map((r: any) => r.name ?? r[1]) as string[];
    const selectList = columns.map((c) => `\`${c}\``).join(", ");
    return { columns, selectList };
}

async function readAllRowsPaged(client: Client, table: string): Promise<{ columns: string[]; rows: any[][] }> {
    const { columns, selectList } = await getColumnInfo(client, table);
    if (!columns.length) return { columns: [], rows: [] };

    const rows: any[][] = [];
    let offset = 0;

    for (; ;) {
        const res = await client.execute({
            sql: `SELECT ${selectList} FROM \`${table}\` ORDER BY 1 LIMIT ? OFFSET ?`,
            args: [PAGE_SIZE, offset],
        });
        const page = (res.rows || []).map((row: any) => columns.map((c) => row[c]));
        if (page.length === 0) break;
        rows.push(...page);
        offset += PAGE_SIZE;
        if (page.length < PAGE_SIZE) break;
    }

    return { columns, rows };
}

function deleteAllFromTarget(db: DatabaseSync, table: string) {
    db.exec(`DELETE FROM \`${table}\``);
}

function insertBatchIntoTarget(db: DatabaseSync, table: string, columns: string[], rows: any[][]) {
    if (!rows.length) return;
    const placeholders = columns.map(() => "?").join(",");
    const cols = columns.map((c) => `\`${c}\``).join(",");
    const stmt = db.prepare(`INSERT INTO \`${table}\` (${cols}) VALUES (${placeholders})`);
    db.exec("BEGIN");
    try {
        for (const r of rows) stmt.run(...r);
        db.exec("COMMIT");
    } catch (e) {
        db.exec("ROLLBACK");
        throw e;
    }
}

async function syncDatabases() {
    const targetPath = findMiniflareDb();
    console.log(`Starting sync from staging to miniflare D1 at ${targetPath}...`);

    const target = new DatabaseSync(targetPath);
    try {
        for (const table of TABLES) {
            console.log(`\nSyncing ${table} table...`);
            const client = getStagingClient();
            try {
                deleteAllFromTarget(target, table);
                console.log(`  Cleared existing ${table} data`);

                const { columns, rows } = await readAllRowsPaged(client, table);

                await (client as any).close?.();

                if (rows.length) {
                    insertBatchIntoTarget(target, table, columns, rows);
                    console.log(`  Inserted ${rows.length} rows into ${table}`);
                } else {
                    console.log(`  No data to sync for ${table}`);
                }
            } catch (err) {
                try { await (client as any).close?.(); } catch { }
                throw err;
            }
        }

        console.log("\n✓ Sync complete!");
        for (const table of TABLES) {
            const row = target.prepare(`SELECT COUNT(*) AS c FROM \`${table}\``).get() as { c: number };
            console.log(`  - ${table[0].toUpperCase() + table.slice(1)} count: ${row.c}`);
        }
    } catch (e) {
        console.error("Error during sync:");
        if (e instanceof Error && e.stack) console.error(e.stack);
        else console.error(e);
        process.exit(1);
    } finally {
        target.close();
    }
}

syncDatabases().catch((e) => {
    console.error(e);
    process.exit(1);
});
