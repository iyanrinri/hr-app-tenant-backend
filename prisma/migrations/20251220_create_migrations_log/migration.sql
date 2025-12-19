-- Migration: Create migrations_log table to track executed migrations
-- This table ensures migrations are only run once per tenant database

DO $$
BEGIN
  -- Create migrations_log table if it doesn't exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'migrations_log') THEN
    CREATE TABLE migrations_log (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP NOT NULL DEFAULT NOW(),
      success BOOLEAN NOT NULL DEFAULT true,
      error_message TEXT
    );
    
    CREATE INDEX idx_migrations_log_name ON migrations_log(migration_name);
    
    RAISE NOTICE 'Created migrations_log table';
  ELSE
    RAISE NOTICE 'migrations_log table already exists';
  END IF;
END $$;
