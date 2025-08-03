#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

class SchemaComparer {
  constructor() {
    this.tables = ['divisions', 'boxers', 'boxerBouts'];
    this.environments = {
      production: { preview: false, name: 'Production' },
      preview: { preview: true, name: 'Preview' }
    };
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async getTableInfo(table, isPreview = false) {
    try {
      const cmd = `wrangler d1 execute boxingundefeated-com --command="PRAGMA table_info(${table});" ${isPreview ? '--preview' : ''} --json`;
      const result = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
      const data = JSON.parse(result);
      
      if (data[0] && data[0].results) {
        return data[0].results.map(col => ({
          name: col.name,
          type: col.type,
          notNull: col.notnull === 1,
          defaultValue: col.dflt_value,
          primaryKey: col.pk === 1
        }));
      }
      return [];
    } catch (error) {
      console.error(`Error getting table info for ${table}:`, error.message);
      return null;
    }
  }

  async getMigrations(isPreview = false) {
    try {
      const cmd = `wrangler d1 execute boxingundefeated-com --command="SELECT name FROM _hub_migrations ORDER BY id;" ${isPreview ? '--preview' : ''} --json`;
      const result = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
      const data = JSON.parse(result);
      
      if (data[0] && data[0].results) {
        return data[0].results.map(r => r.name);
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  compareColumns(table, prodCols, previewCols) {
    const differences = [];
    
    // Create maps for easy lookup
    const prodMap = new Map(prodCols.map(col => [col.name, col]));
    const previewMap = new Map(previewCols.map(col => [col.name, col]));
    
    // Check for missing columns in production
    for (const [name, col] of previewMap) {
      if (!prodMap.has(name)) {
        differences.push({
          type: 'missing_in_prod',
          column: name,
          details: `Column '${name}' exists in preview but not in production`
        });
      }
    }
    
    // Check for extra columns in production
    for (const [name, col] of prodMap) {
      if (!previewMap.has(name)) {
        differences.push({
          type: 'extra_in_prod',
          column: name,
          details: `Column '${name}' exists in production but not in preview`
        });
      }
    }
    
    // Check for type differences
    for (const [name, prodCol] of prodMap) {
      const previewCol = previewMap.get(name);
      if (previewCol && prodCol.type !== previewCol.type) {
        differences.push({
          type: 'type_mismatch',
          column: name,
          details: `Column '${name}' type differs: ${prodCol.type} (prod) vs ${previewCol.type} (preview)`
        });
      }
    }
    
    return differences;
  }

  async compareEnvironments() {
    this.log('\n🔍 Database Schema Comparison\n', 'bold');
    
    // Get migrations for both environments
    this.log('📋 Fetching migrations...', 'cyan');
    const [prodMigrations, previewMigrations] = await Promise.all([
      this.getMigrations(false),
      this.getMigrations(true)
    ]);
    
    this.log(`\nProduction migrations: ${prodMigrations.length}`, 'blue');
    this.log(`Preview migrations: ${previewMigrations.length}`, 'blue');
    
    // Find migration differences
    const missingInProd = previewMigrations.filter(m => !prodMigrations.includes(m));
    const missingInPreview = prodMigrations.filter(m => !previewMigrations.includes(m));
    
    if (missingInProd.length > 0) {
      this.log('\n⚠️  Migrations in preview but not in production:', 'yellow');
      missingInProd.forEach(m => this.log(`   - ${m}`, 'yellow'));
    }
    
    if (missingInPreview.length > 0) {
      this.log('\n⚠️  Migrations in production but not in preview:', 'yellow');
      missingInPreview.forEach(m => this.log(`   - ${m}`, 'yellow'));
    }
    
    // Compare table schemas
    this.log('\n📊 Comparing table schemas...', 'cyan');
    let totalDifferences = 0;
    
    for (const table of this.tables) {
      this.log(`\n📑 Table: ${table}`, 'bold');
      this.log('─'.repeat(50));
      
      const [prodCols, previewCols] = await Promise.all([
        this.getTableInfo(table, false),
        this.getTableInfo(table, true)
      ]);
      
      if (!prodCols || !previewCols) {
        this.log(`   ❌ Failed to fetch schema information`, 'red');
        continue;
      }
      
      this.log(`   Production: ${prodCols.length} columns`);
      this.log(`   Preview: ${previewCols.length} columns`);
      
      const differences = this.compareColumns(table, prodCols, previewCols);
      
      if (differences.length === 0) {
        this.log(`   ✅ Schemas match`, 'green');
      } else {
        totalDifferences += differences.length;
        this.log(`   ❌ Found ${differences.length} differences:`, 'red');
        
        differences.forEach(diff => {
          this.log(`      - ${diff.details}`, 'red');
        });
        
        // Show column lists if there are differences
        this.log(`\n   Production columns:`, 'cyan');
        this.log(`   ${prodCols.map(c => c.name).join(', ')}`);
        this.log(`\n   Preview columns:`, 'cyan');
        this.log(`   ${previewCols.map(c => c.name).join(', ')}`);
      }
    }
    
    // Summary
    this.log('\n' + '═'.repeat(60), 'bold');
    this.log('📈 Summary', 'bold');
    this.log('═'.repeat(60) + '\n', 'bold');
    
    const hasIssues = totalDifferences > 0 || missingInProd.length > 0 || missingInPreview.length > 0;
    
    if (hasIssues) {
      this.log(`❌ Schema synchronization required!`, 'red');
      this.log(`\n   Total differences found: ${totalDifferences}`, 'red');
      if (missingInProd.length > 0) {
        this.log(`   Missing migrations in production: ${missingInProd.length}`, 'red');
      }
      if (missingInPreview.length > 0) {
        this.log(`   Missing migrations in preview: ${missingInPreview.length}`, 'red');
      }
      
      this.log('\n🔧 To fix:', 'yellow');
      if (missingInProd.length > 0) {
        this.log('   1. Apply missing migrations to production', 'yellow');
        this.log('   2. Or check if production has been reset/cleaned', 'yellow');
      }
      if (totalDifferences > 0) {
        this.log('   3. Review schema differences and apply necessary migrations', 'yellow');
      }
      
      process.exit(1);
    } else {
      this.log(`✅ All schemas are in sync!`, 'green');
      this.log(`\n   All tables match between production and preview`, 'green');
      process.exit(0);
    }
  }

  async run() {
    try {
      await this.compareEnvironments();
    } catch (error) {
      this.log(`\n❌ Error during schema comparison: ${error.message}`, 'red');
      process.exit(1);
    }
  }
}

// Run the comparison
if (require.main === module) {
  const comparer = new SchemaComparer();
  comparer.run();
}