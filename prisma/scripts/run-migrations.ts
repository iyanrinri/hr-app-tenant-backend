/**
 * Migration Runner Script
 * Menjalankan migration SQL ke semua tenant database ({tenant_slug}_erp)
 * 
 * Run: npm run migrate:tenants
 */

import 'dotenv/config';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const baseUrl = new URL(DATABASE_URL);

/**
 * Migrations that should only run on master database, not tenant databases
 */
const MASTER_ONLY_MIGRATIONS = new Set([
  '20251213222603_init', // Creates tenants and users tables (master DB only)
]);

/**
 * Get all tenants from master database
 */
async function getAllTenants(): Promise<any[]> {
  const masterPool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    const result = await masterPool.query(
      'SELECT id, slug, name FROM tenants WHERE id IS NOT NULL'
    );
    console.log(`✅ Found ${result.rows.length} tenants`);
    return result.rows;
  } finally {
    await masterPool.end();
  }
}

/**
 * Get all migration folders
 */
function getAllMigrations(): string[] {
  const migrationsDir = path.join(process.cwd(), 'prisma/migrations-tenant');
  
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
  
  // Filter only directories and sort by name (timestamp prefix ensures order)
  const migrations = entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();

  return migrations;
}

/**
 * Read migration SQL file
 */
function getMigrationSQL(migrationName: string): string {
  const migrationPath = path.join(
    process.cwd(),
    `prisma/migrations-tenant/${migrationName}/migration.sql`
  );
  
  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Migration file not found: ${migrationPath}`);
  }

  return fs.readFileSync(migrationPath, 'utf-8');
}

/**
 * Parse SQL statements from migration file
 * Handles multi-line statements, comments, and dollar-quoted strings properly
 */
function parseSQLStatements(sql: string): string[] {
  const statements: string[] = [];
  let currentStatement = '';
  let inDollarQuote = false;
  let dollarQuoteTag = '';

  const lines = sql.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines when not in dollar quote
    if (!inDollarQuote && !trimmedLine) {
      continue;
    }

    // Skip comment lines when not in dollar quote
    if (!inDollarQuote && trimmedLine.startsWith('--')) {
      continue;
    }

    // Check for dollar-quoted strings (e.g., $$ or $tag$)
    const dollarMatches = line.match(/\$(\w*)\$/g);
    if (dollarMatches) {
      for (const match of dollarMatches) {
        if (!inDollarQuote) {
          // Start of dollar quote
          inDollarQuote = true;
          dollarQuoteTag = match;
        } else if (match === dollarQuoteTag) {
          // End of dollar quote
          inDollarQuote = false;
          dollarQuoteTag = '';
        }
      }
    }

    currentStatement += (currentStatement ? '\n' : '') + line;

    // If line ends with semicolon and we're not in a dollar quote, it's the end of a statement
    if (!inDollarQuote && trimmedLine.endsWith(';')) {
      const statement = currentStatement
        .trim()
        .replace(/;$/, '') // Remove trailing semicolon
        .trim();

      if (statement.length > 0) {
        statements.push(statement);
      }

      currentStatement = '';
    }
  }

  // Don't forget any remaining statement
  if (currentStatement.trim().length > 0) {
    statements.push(currentStatement.trim());
  }

  return statements;
}

/**
 * Check if migration has already been executed for this tenant
 */
async function isMigrationExecuted(
  pool: Pool,
  migrationName: string
): Promise<boolean> {
  try {
    const result = await pool.query(
      'SELECT success FROM migrations_log WHERE migration_name = $1',
      [migrationName]
    );
    
    // Migration was executed and successful
    if (result.rows.length > 0 && result.rows[0].success) {
      return true;
    }
    
    return false;
  } catch (error: any) {
    // If migrations_log table doesn't exist yet, migration hasn't been executed
    if (error.code === '42P01') { // undefined_table
      return false;
    }
    throw error;
  }
}

/**
 * Record migration execution in migrations_log
 */
async function recordMigration(
  pool: Pool,
  migrationName: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO migrations_log (migration_name, success, error_message) 
       VALUES ($1, $2, $3)
       ON CONFLICT (migration_name) 
       DO UPDATE SET 
         executed_at = NOW(),
         success = $2,
         error_message = $3`,
      [migrationName, success, errorMessage || null]
    );
  } catch (error: any) {
    // If migrations_log doesn't exist, skip recording (it will be created by its own migration)
    if (error.code === '42P01') {
      return;
    }
    throw error;
  }
}

/**
 * Run migration for a specific tenant
 */
async function runMigrationForTenant(
  tenantSlug: string,
  migrationName: string,
  migrationSQL: string
): Promise<boolean> {
  const tenantDbUrl = new URL(baseUrl.toString());
  tenantDbUrl.pathname = `/${tenantSlug.trim()}_erp`;

  const pool = new Pool({
    connectionString: tenantDbUrl.toString(),
  });

  try {
    // Skip if this is a master-only migration
    if (MASTER_ONLY_MIGRATIONS.has(migrationName)) {
      console.log(`   ⏭️  ${migrationName} (master-only, skipped)`);
      return true;
    }

    // Check if migration already executed
    const alreadyExecuted = await isMigrationExecuted(pool, migrationName);
    if (alreadyExecuted) {
      console.log(`   ⏭️  ${migrationName} (already executed)`);
      return true;
    }

    console.log(`   🔄 ${migrationName}...`);
    
    // Parse SQL statements properly
    const statements = parseSQLStatements(migrationSQL);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await pool.query(statement);
      } catch (error: any) {
        // Ignore "already exists" errors
        if (
          error.code === '42P07' || // relation already exists
          error.code === '42710' || // object already exists  
          error.message?.includes('already exists')
        ) {
          continue;
        }
        throw error;
      }
    }

    // Record successful migration
    await recordMigration(pool, migrationName, true);

    console.log(`   ✅ ${migrationName} completed`);
    return true;
  } catch (error: any) {
    // Record failed migration
    await recordMigration(pool, migrationName, false, error.message);
    
    console.error(`   ❌ ${migrationName} failed: ${error.message}`);
    return false;
  } finally {
    await pool.end();
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🚀 Starting migration runner...\n');

    // Get migration name from command line argument (optional)
    const specificMigration = process.argv[2];
    
    let migrations: string[];
    
    if (specificMigration) {
      // Run specific migration
      console.log(`📦 Running specific migration: ${specificMigration}\n`);
      migrations = [specificMigration];
    } else {
      // Run all migrations
      migrations = getAllMigrations();
      console.log(`📦 Found ${migrations.length} migrations to run:\n`);
      migrations.forEach((m, i) => console.log(`   ${i + 1}. ${m}`));
      console.log();
    }

    // Get all tenants
    const tenants = await getAllTenants();

    if (tenants.length === 0) {
      console.log('⚠️  No tenants found. Please create a tenant first.');
      process.exit(0);
    }

    console.log();

    // Run migrations for each tenant
    let totalSuccess = 0;
    let totalFailed = 0;

    for (const tenant of tenants) {
      console.log(`\n📍 Tenant: ${tenant.slug} (${tenant.name})`);
      
      for (const migrationName of migrations) {
        try {
          const migrationSQL = getMigrationSQL(migrationName);
          const success = await runMigrationForTenant(
            tenant.slug,
            migrationName,
            migrationSQL
          );
          
          if (success) {
            totalSuccess++;
          } else {
            totalFailed++;
          }
        } catch (error: any) {
          console.error(`   ❌ ${migrationName}: ${error.message}`);
          totalFailed++;
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📊 Migration Results:`);
    console.log(`✅ Successful: ${totalSuccess}`);
    console.log(`❌ Failed: ${totalFailed}`);
    console.log('='.repeat(60));

    if (totalFailed > 0) {
      console.log('\n⚠️  Some migrations failed. Check errors above.');
      process.exit(1);
    }

    console.log('\n🎉 All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
