#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RECORDS_PER_FILE = 5000; // Adjust based on SQLite limits

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

// Get the next migration number
const migrationsDir = path.join(__dirname, '../server/database/migrations');
const existingMigrations = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();
const lastMigration = existingMigrations[existingMigrations.length - 1];
const lastNumber = parseInt(lastMigration.split('_')[0]);
let nextNumber = lastNumber + 1;

// Generate migration files
chunks.forEach((chunk, index) => {
  const migrationNumber = String(nextNumber + index).padStart(4, '0');
  const partNumber = index + 1;
  const totalParts = chunks.length;
  
  const startRecord = index * RECORDS_PER_FILE + 1;
  const endRecord = Math.min((index + 1) * RECORDS_PER_FILE, lines.length);
  
  const content = `-- Seed boxer bouts data part ${partNumber} of ${totalParts}
-- Generated from boxer-bouts-clean.sql (records ${startRecord} to ${endRecord})
-- Individual INSERT statements to avoid SQLITE_TOOBIG error

${chunk.join('\n')}
`;
  
  const filename = `${migrationNumber}_seed-boxer-bouts-part${partNumber}.sql`;
  const filepath = path.join(migrationsDir, filename);
  
  fs.writeFileSync(filepath, content);
  console.log(`Created: ${filename}`);
});

console.log('\nMigration files created successfully!');
console.log('Next steps:');
console.log('1. Commit these migration files');
console.log('2. Deploy to NuxtHub: npx nuxthub deploy');