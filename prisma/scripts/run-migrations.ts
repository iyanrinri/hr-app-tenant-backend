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
 * Read migration SQL file
 */
function getMigrationSQL(migrationName?: string): string {
  // Default to leave tables migration if not specified
  const migration = migrationName || '20251218_create_leave_tables';
  
  const migrationPath = path.join(
    __dirname,
    `../migrations/${migration}/migration.sql`
  );
  
  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Migration file not found: ${migrationPath}`);
  }

  console.log(`📄 Reading migration: ${migration}`);
  return fs.readFileSync(migrationPath, 'utf-8');
}

/**
 * Parse SQL statements from migration file
 * Handles multi-line statements and comments properly
 */
function parseSQLStatements(sql: string): string[] {
  const statements: string[] = [];
  let currentStatement = '';

  const lines = sql.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('--')) {
      continue;
    }

    currentStatement += ' ' + trimmedLine;

    // If line ends with semicolon, it's the end of a statement
    if (trimmedLine.endsWith(';')) {
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
 * Run migration for a specific tenant
 */
async function runMigrationForTenant(
  tenantSlug: string,
  migrationSQL: string
): Promise<boolean> {
  const tenantDbUrl = new URL(baseUrl.toString());
  tenantDbUrl.pathname = `/${tenantSlug.trim()}_erp`;

  const pool = new Pool({
    connectionString: tenantDbUrl.toString(),
  });

  try {
    console.log(`🔄 Running migration for tenant: ${tenantSlug}...`);
    
    // Parse SQL statements properly
    const statements = parseSQLStatements(migrationSQL);

    console.log(`   📝 Found ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        console.log(`   ⏳ Executing [${i + 1}/${statements.length}]...`);
        await pool.query(statement);
        console.log(`   ✓ [${i + 1}/${statements.length}] executed`);
      } catch (error: any) {
        // Ignore "already exists" errors
        if (error.code === '42P07' || error.message?.includes('already exists')) {
          console.log(`   ⚠️  [${i + 1}/${statements.length}] Already exists (skipped)`);
          continue;
        }
        throw error;
      }
    }

    console.log(`✅ Migration completed for tenant: ${tenantSlug}\n`);
    return true;
  } catch (error: any) {
    console.error(`❌ Migration failed for tenant: ${tenantSlug}`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code}`);
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

    // Get migration name from command line argument
    const migrationName = process.argv[2];
    
    if (migrationName) {
      console.log(`📦 Migration: ${migrationName}\n`);
    } else {
      console.log(`📦 Migration: 20251218_create_leave_tables (default)\n`);
    }

    // Get all tenants
    const tenants = await getAllTenants();

    if (tenants.length === 0) {
      console.log('⚠️  No tenants found. Please create a tenant first.');
      process.exit(0);
    }

    // Read migration SQL
    const migrationSQL = getMigrationSQL(migrationName);

    // Run migration for each tenant
    let successCount = 0;
    let failureCount = 0;

    for (const tenant of tenants) {
      const success = await runMigrationForTenant(tenant.slug, migrationSQL);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📊 Migration Results:`);
    console.log(`✅ Successful: ${successCount}/${tenants.length}`);
    console.log(`❌ Failed: ${failureCount}/${tenants.length}`);
    console.log('='.repeat(60));

    if (failureCount > 0) {
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
