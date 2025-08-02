#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RECORDS_PER_FILE = 500; // Much smaller batches to ensure build success

// Read the boxer-bouts-clean.sql file
const sqlContent = fs.readFileSync(path.join(__dirname, '../boxer-bouts-clean.sql'), 'utf-8');
const lines = sqlContent.trim().split('\n');

console.log(`Total records: ${lines.length}`);
console.log(`Records per file: ${RECORDS_PER_FILE}`);
console.log(`Number of files: ${Math.ceil(lines.length / RECORDS_PER_FILE)}`);

// Split into chunks
const chunks = [];
for (let i = 0; i < lines.length; i += RECORDS_PER_FILE) {
  chunks.push(lines.slice(i, i + RECORDS_PER_FILE));
}

// Remove old migration
const migrationsDir = path.join(__dirname, '../server/database/migrations');
const oldMigration = path.join(migrationsDir, '0016_seed-boxer-bouts-compressed.sql');
if (fs.existsSync(oldMigration)) {
  fs.unlinkSync(oldMigration);
  console.log('Removed old migration file');
}

// Start from migration 0016
let migrationNumber = 16;

// Generate migration files with smaller batches
chunks.forEach((chunk, index) => {
  const currentMigration = String(migrationNumber + index).padStart(4, '0');
  const batchNumber = index + 1;
  const totalBatches = chunks.length;
  
  const startRecord = index * RECORDS_PER_FILE + 1;
  const endRecord = Math.min((index + 1) * RECORDS_PER_FILE, lines.length);
  
  // Create a migration that's small enough to not cause build issues
  const content = `-- Boxer bouts data batch ${batchNumber} of ${totalBatches}
-- Records ${startRecord} to ${endRecord} (${chunk.length} records)
-- Using small batches to avoid build timeouts

${chunk.join('\n')}
`;
  
  const filename = `${currentMigration}_boxer-bouts-batch-${String(batchNumber).padStart(3, '0')}.sql`;
  const filepath = path.join(migrationsDir, filename);
  
  fs.writeFileSync(filepath, content);
  console.log(`Created: ${filename} (${chunk.length} records)`);
});

console.log('\nBatched migration files created successfully!');
console.log(`Created ${chunks.length} migration files with ${RECORDS_PER_FILE} records each`);
console.log('\nNext steps:');
console.log('1. Commit these migration files');
console.log('2. Push to trigger deployment');
console.log('3. NuxtHub will run all migrations automatically');