-- ========================================
-- ADD SETTINGS TABLE AND FIX ATTENDANCE_LOG
-- Date: 2025-12-31
-- Description: 
-- 1. Create settings table for tenant configuration
-- 2. Fix attendance_log to ensure 'action' column exists
-- ========================================

-- ========================================
-- 1. CREATE SETTINGS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS "settings" (
    "id" BIGSERIAL PRIMARY KEY,
    "key" VARCHAR(255) NOT NULL UNIQUE,
    "value" TEXT,
    "dataType" VARCHAR(50) DEFAULT 'STRING',
    "category" VARCHAR(100),
    "description" TEXT,
    "isPublic" BOOLEAN DEFAULT false,
    "createdBy" VARCHAR(255),
    "updatedBy" VARCHAR(255),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for settings
CREATE INDEX IF NOT EXISTS "idx_settings_key" ON "settings"("key");
CREATE INDEX IF NOT EXISTS "idx_settings_category" ON "settings"("category");
CREATE INDEX IF NOT EXISTS "idx_settings_is_public" ON "settings"("isPublic");

-- ========================================
-- 2. FIX ATTENDANCE_LOG TABLE
-- ========================================
DO $$ 
BEGIN
  -- Check if 'type' column exists but 'action' doesn't
  -- If so, add 'action' as alias to 'type' for backward compatibility
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_log' AND column_name = 'type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_log' AND column_name = 'action'
  ) THEN
    -- Add action column as an alias/copy of type
    ALTER TABLE "attendance_log" ADD COLUMN "action" VARCHAR(100);
    
    -- Copy existing type values to action
    UPDATE "attendance_log" SET "action" = "type" WHERE "type" IS NOT NULL;
    
    RAISE NOTICE 'Added action column to attendance_log';
  END IF;

  -- Ensure both columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_log' AND column_name = 'action'
  ) THEN
    ALTER TABLE "attendance_log" ADD COLUMN "action" VARCHAR(100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_log' AND column_name = 'type'
  ) THEN
    ALTER TABLE "attendance_log" ADD COLUMN "type" VARCHAR(50);
  END IF;

  -- Ensure employeeId exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_log' AND column_name = 'employeeId'
  ) THEN
    ALTER TABLE "attendance_log" ADD COLUMN "employeeId" BIGINT;
  END IF;

  -- Ensure timestamp exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_log' AND column_name = 'timestamp'
  ) THEN
    ALTER TABLE "attendance_log" ADD COLUMN "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;

  -- Ensure location exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_log' AND column_name = 'location'
  ) THEN
    ALTER TABLE "attendance_log" ADD COLUMN "location" TEXT;
  END IF;

  -- Ensure ipAddress exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_log' AND column_name = 'ipAddress'
  ) THEN
    ALTER TABLE "attendance_log" ADD COLUMN "ipAddress" VARCHAR(45);
  END IF;

  -- Ensure userAgent exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_log' AND column_name = 'userAgent'
  ) THEN
    ALTER TABLE "attendance_log" ADD COLUMN "userAgent" TEXT;
  END IF;

END $$;

-- ========================================
-- 3. SEED DEFAULT SETTINGS (OPTIONAL)
-- ========================================
-- Note: Using underscore-based naming convention for API consistency
INSERT INTO "settings" ("key", "value", "dataType", "category", "description", "isPublic", "createdBy")
VALUES 
  ('attendance_location_required', 'false', 'BOOLEAN', 'ATTENDANCE', 'Require location for check-in/out', false, 'system'),
  ('attendance_location_radius', '100', 'NUMBER', 'ATTENDANCE', 'Maximum distance from office (meters)', false, 'system'),
  ('attendance_photo_required', 'false', 'BOOLEAN', 'ATTENDANCE', 'Require photo for check-in/out', false, 'system'),
  ('attendance_office_latitude', '0', 'NUMBER', 'ATTENDANCE', 'Office latitude coordinate', false, 'system'),
  ('attendance_office_longitude', '0', 'NUMBER', 'ATTENDANCE', 'Office longitude coordinate', false, 'system'),
  ('company_name', 'My Company', 'STRING', 'COMPANY', 'Company name', true, 'system'),
  ('company_timezone', 'UTC', 'STRING', 'COMPANY', 'Company timezone', false, 'system'),
  ('company_language', 'en', 'STRING', 'COMPANY', 'Default language', false, 'system')
ON CONFLICT ("key") DO NOTHING;

-- Log completion
DO $$ 
BEGIN
  RAISE NOTICE '✅ Settings table created and attendance_log fixed';
END $$;
