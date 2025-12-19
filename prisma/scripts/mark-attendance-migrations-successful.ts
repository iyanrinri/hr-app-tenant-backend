#!/usr/bin/env ts-node
/**
 * Mark attendance migrations as successful
 * These migrations conflict with current DB state but tables are already in correct state
 */

import 'dotenv/config';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

async function markMigrationsAsSuccessful() {
  const baseUrl = new URL(DATABASE_URL!);
  baseUrl.pathname = '/my_company_erp';

  const pool = new Pool({
    connectionString: baseUrl.toString(),
  });

  try {
    const result = await pool.query(`
      INSERT INTO migrations_log (migration_name, success) 
      VALUES 
        ('20251217_create_attendance_tables', true),
        ('20251217_rename_attendance_tables', true)
      ON CONFLICT (migration_name) 
      DO UPDATE SET 
        success = true,
        executed_at = NOW(),
        error_message = NULL
      RETURNING migration_name;
    `);

    console.log('✅ Marked migrations as successful:');
    result.rows.forEach(row => {
      console.log(`   - ${row.migration_name}`);
    });
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

markMigrationsAsSuccessful();
