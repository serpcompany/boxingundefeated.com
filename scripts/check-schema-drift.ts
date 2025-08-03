#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

interface SchemaCheckResult {
  environment: string;
  tables: Record<string, any>;
  migrations: string[];
  timestamp: string;
}

class SchemaChecker {
  private tempDir = join(process.cwd(), '.schema-check');
  
  constructor() {
    // Create temp directory for introspection results
    if (!existsSync(this.tempDir)) {
      mkdirSync(this.tempDir, { recursive: true });
    }
  }
  
  async checkProduction(): Promise<SchemaCheckResult> {
    console.log(chalk.blue('🔍 Checking production schema...'));
    
    // Create a temporary drizzle config for production
    const prodConfig = `
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './server/database/schema/index.ts',
  out: './.schema-check/production',
  dbCredentials: {
    url: 'file:./.schema-check/prod.db'
  }
})`;
    
    writeFileSync(join(this.tempDir, 'drizzle.config.prod.ts'), prodConfig);
    
    // Use wrangler to export production schema
    try {
      execSync(`wrangler d1 execute boxingundefeated-com --command="SELECT sql FROM sqlite_master WHERE type='table';" --json > ${this.tempDir}/prod-schema.json`, {
        stdio: 'pipe'
      });
      
      const schema = JSON.parse(readFileSync(join(this.tempDir, 'prod-schema.json'), 'utf-8'));
      
      // Get migrations
      const migrationsResult = execSync(`wrangler d1 execute boxingundefeated-com --command="SELECT name FROM _hub_migrations ORDER BY id;" --json`, {
        encoding: 'utf-8'
      });
      
      const migrations = JSON.parse(migrationsResult);
      
      return {
        environment: 'production',
        tables: this.parseSchema(schema),
        migrations: migrations[0]?.results?.map((r: any) => r.name) || [],
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error(chalk.red('Failed to check production schema:'), error.message);
      throw error;
    }
  }
  
  async checkPreview(): Promise<SchemaCheckResult> {
    console.log(chalk.blue('🔍 Checking preview schema...'));
    
    try {
      execSync(`wrangler d1 execute boxingundefeated-com --preview --command="SELECT sql FROM sqlite_master WHERE type='table';" --json > ${this.tempDir}/preview-schema.json`, {
        stdio: 'pipe'
      });
      
      const schema = JSON.parse(readFileSync(join(this.tempDir, 'preview-schema.json'), 'utf-8'));
      
      // Get migrations
      const migrationsResult = execSync(`wrangler d1 execute boxingundefeated-com --preview --command="SELECT name FROM _hub_migrations ORDER BY id;" --json`, {
        encoding: 'utf-8'
      });
      
      const migrations = JSON.parse(migrationsResult);
      
      return {
        environment: 'preview',
        tables: this.parseSchema(schema),
        migrations: migrations[0]?.results?.map((r: any) => r.name) || [],
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error(chalk.red('Failed to check preview schema:'), error.message);
      throw error;
    }
  }
  
  async checkLocal(): Promise<SchemaCheckResult> {
    console.log(chalk.blue('🔍 Checking local schema from Drizzle files...'));
    
    // Read the actual TypeScript schema files
    const schemaFiles = ['boxers', 'boxerBouts', 'divisions'];
    const tables: Record<string, any> = {};
    
    for (const file of schemaFiles) {
      const schemaPath = join(process.cwd(), 'server/database/schema', `${file}.ts`);
      if (existsSync(schemaPath)) {
        const content = readFileSync(schemaPath, 'utf-8');
        tables[file] = this.parseTypeScriptSchema(content);
      }
    }
    
    return {
      environment: 'local',
      tables,
      migrations: [], // Local doesn't have migrations applied
      timestamp: new Date().toISOString()
    };
  }
  
  private parseSchema(schemaResult: any): Record<string, any> {
    const tables: Record<string, any> = {};
    
    if (schemaResult[0]?.results) {
      for (const row of schemaResult[0].results) {
        const sql = row.sql;
        const tableMatch = sql.match(/CREATE TABLE `?(\w+)`?/i);
        if (tableMatch) {
          const tableName = tableMatch[1];
          if (!tableName.startsWith('_')) { // Skip system tables
            tables[tableName] = {
              sql,
              columns: this.extractColumns(sql)
            };
          }
        }
      }
    }
    
    return tables;
  }
  
  private extractColumns(createTableSql: string): string[] {
    const columns: string[] = [];
    const columnSection = createTableSql.match(/\(([\s\S]+)\)/);
    
    if (columnSection) {
      const lines = columnSection[1].split(',').map(l => l.trim());
      for (const line of lines) {
        const columnMatch = line.match(/^`?(\w+)`?\s+/);
        if (columnMatch && !line.includes('INDEX') && !line.includes('KEY')) {
          columns.push(columnMatch[1]);
        }
      }
    }
    
    return columns;
  }
  
  private parseTypeScriptSchema(content: string): any {
    const columns: string[] = [];
    
    // Match Drizzle column definitions
    const columnMatches = content.matchAll(/(\w+):\s*\w+\(['"']?(\w+)['"']?\)/g);
    
    for (const match of columnMatches) {
      columns.push(match[1]);
    }
    
    return { columns, source: 'typescript' };
  }
  
  compareSchemas(prod: SchemaCheckResult, preview: SchemaCheckResult, local: SchemaCheckResult) {
    console.log(chalk.yellow('\n📊 Schema Comparison Report\n'));
    
    let hasIssues = false;
    
    // Compare migrations
    console.log(chalk.cyan('📋 Migrations:'));
    console.log(`  Production: ${prod.migrations.length} migrations`);
    console.log(`  Preview: ${preview.migrations.length} migrations`);
    
    const missingInProd = preview.migrations.filter(m => !prod.migrations.includes(m));
    if (missingInProd.length > 0) {
      hasIssues = true;
      console.log(chalk.red(`\n  ⚠️  Missing in production:`));
      missingInProd.forEach(m => console.log(`     - ${m}`));
    }
    
    // Compare tables
    console.log(chalk.cyan('\n📑 Tables:'));
    const allTables = new Set([
      ...Object.keys(prod.tables),
      ...Object.keys(preview.tables),
      ...Object.keys(local.tables)
    ]);
    
    for (const table of allTables) {
      console.log(`\n  ${chalk.bold(table)}:`);
      
      const prodCols = prod.tables[table]?.columns || [];
      const previewCols = preview.tables[table]?.columns || [];
      const localCols = local.tables[table]?.columns || [];
      
      // Check if table exists in all environments
      if (!prod.tables[table]) {
        hasIssues = true;
        console.log(chalk.red('    ❌ Missing in production'));
      }
      if (!preview.tables[table]) {
        hasIssues = true;
        console.log(chalk.red('    ❌ Missing in preview'));
      }
      if (!local.tables[table]) {
        console.log(chalk.yellow('    ⚠️  Missing in local schema files'));
      }
      
      // Compare columns
      const allColumns = new Set([...prodCols, ...previewCols, ...localCols]);
      const columnDiffs: string[] = [];
      
      for (const col of allColumns) {
        const inProd = prodCols.includes(col);
        const inPreview = previewCols.includes(col);
        const inLocal = localCols.includes(col);
        
        if (!inProd && inPreview) {
          columnDiffs.push(`${col} (missing in prod)`);
          hasIssues = true;
        } else if (inProd && !inPreview) {
          columnDiffs.push(`${col} (missing in preview)`);
          hasIssues = true;
        }
      }
      
      if (columnDiffs.length > 0) {
        console.log(chalk.red(`    ❌ Column differences: ${columnDiffs.join(', ')}`));
      } else if (prod.tables[table] && preview.tables[table]) {
        console.log(chalk.green('    ✅ Schemas match'));
      }
    }
    
    // Summary
    console.log(chalk.yellow('\n📈 Summary:'));
    if (hasIssues) {
      console.log(chalk.red('❌ Schema synchronization required!'));
      
      // Provide actionable steps
      console.log(chalk.cyan('\n🔧 To fix:'));
      if (missingInProd.length > 0) {
        console.log('  1. Apply missing migrations to production:');
        console.log('     npm run db:migrate -- --env=production');
      }
      
      process.exit(1);
    } else {
      console.log(chalk.green('✅ All schemas are in sync!'));
      process.exit(0);
    }
  }
  
  async run() {
    try {
      const [prod, preview, local] = await Promise.all([
        this.checkProduction(),
        this.checkPreview(),
        this.checkLocal()
      ]);
      
      this.compareSchemas(prod, preview, local);
      
    } catch (error: any) {
      console.error(chalk.red('Schema check failed:'), error.message);
      process.exit(1);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new SchemaChecker();
  checker.run();
}