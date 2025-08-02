#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const API_URL = process.env.API_URL || 'https://boxingundefeated.com/api/admin/import-sql';
const SECRET = process.env.IMPORT_SECRET || 'temporary-secret-change-me';
const BATCH_SIZE = 100; // Statements per request

async function importData() {
  console.log('Reading boxer-bouts-clean.sql...');
  const sqlContent = fs.readFileSync(path.join(__dirname, '../boxer-bouts-clean.sql'), 'utf-8');
  const statements = sqlContent.trim().split('\n').filter(line => line.trim());
  
  console.log(`Total statements to import: ${statements.length}`);
  console.log(`Batch size: ${BATCH_SIZE} statements per request`);
  console.log(`Total batches: ${Math.ceil(statements.length / BATCH_SIZE)}`);
  
  let totalSuccess = 0;
  let totalErrors = 0;
  
  // Process in batches
  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    const batch = statements.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(statements.length / BATCH_SIZE);
    
    console.log(`\nProcessing batch ${batchNum}/${totalBatches} (${batch.length} statements)...`);
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SECRET}`
        },
        body: JSON.stringify({
          statements: batch,
          secret: SECRET
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error(`Batch ${batchNum} failed:`, error);
        totalErrors += batch.length;
        continue;
      }
      
      const result = await response.json();
      totalSuccess += result.successCount || 0;
      totalErrors += result.errorCount || 0;
      
      console.log(`Batch ${batchNum} complete: ${result.successCount} success, ${result.errorCount} errors`);
      
      if (result.errors && result.errors.length > 0) {
        console.log('First few errors:', result.errors.slice(0, 3));
      }
      
      // Progress indicator
      const progress = ((i + batch.length) / statements.length * 100).toFixed(1);
      console.log(`Overall progress: ${progress}%`);
      
    } catch (error) {
      console.error(`Batch ${batchNum} error:`, error.message);
      totalErrors += batch.length;
    }
    
    // Small delay between batches
    if (i + BATCH_SIZE < statements.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log('\n=== Import Complete ===');
  console.log(`Total statements: ${statements.length}`);
  console.log(`Successful: ${totalSuccess}`);
  console.log(`Errors: ${totalErrors}`);
  console.log(`Success rate: ${(totalSuccess / statements.length * 100).toFixed(1)}%`);
}

// Run the import
console.log('Starting boxer bouts import to production...');
console.log(`Target: ${API_URL}`);
importData().catch(console.error);