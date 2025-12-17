-- Update attendance table schema to match code expectations
-- This migration adds missing fields and renames columns

-- Add new columns if they don't exist
DO $$ 
BEGIN
  -- Add date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'date'
  ) THEN
    ALTER TABLE "attendance" ADD COLUMN "date" DATE;
    -- Copy data from attendanceDate if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'attendance' AND column_name = 'attendanceDate'
    ) THEN
      UPDATE "attendance" SET "date" = "attendanceDate";
    END IF;
  END IF;

  -- Add checkIn column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'checkIn'
  ) THEN
    ALTER TABLE "attendance" ADD COLUMN "checkIn" TIMESTAMP;
    -- Copy data from checkInTime if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'attendance' AND column_name = 'checkInTime'
    ) THEN
      UPDATE "attendance" SET "checkIn" = "checkInTime";
    END IF;
  END IF;

  -- Add checkOut column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'checkOut'
  ) THEN
    ALTER TABLE "attendance" ADD COLUMN "checkOut" TIMESTAMP;
    -- Copy data from checkOutTime if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'attendance' AND column_name = 'checkOutTime'
    ) THEN
      UPDATE "attendance" SET "checkOut" = "checkOutTime";
    END IF;
  END IF;

  -- Add checkInLocation column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'checkInLocation'
  ) THEN
    ALTER TABLE "attendance" ADD COLUMN "checkInLocation" TEXT;
  END IF;

  -- Add checkOutLocation column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'checkOutLocation'
  ) THEN
    ALTER TABLE "attendance" ADD COLUMN "checkOutLocation" TEXT;
  END IF;

  -- Add workDuration column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'workDuration'
  ) THEN
    ALTER TABLE "attendance" ADD COLUMN "workDuration" INT;
  END IF;
END $$;

-- Update attendance_log table to match code expectations
DO $$ 
BEGIN
  -- Add employeeId column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_log' AND column_name = 'employeeId'
  ) THEN
    ALTER TABLE "attendance_log" ADD COLUMN "employeeId" BIGINT;
    -- Try to populate from attendance table
    UPDATE "attendance_log" al
    SET "employeeId" = a."employeeId"
    FROM "attendance" a
    WHERE al."attendanceId" = a.id;
  END IF;

  -- Rename action to type if needed
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_log' AND column_name = 'type'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_log' AND column_name = 'action'
  ) THEN
    ALTER TABLE "attendance_log" RENAME COLUMN "action" TO "type";
  END IF;

  -- Add type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_log' AND column_name = 'type'
  ) THEN
    ALTER TABLE "attendance_log" ADD COLUMN "type" VARCHAR(50);
  END IF;

  -- Add timestamp column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_log' AND column_name = 'timestamp'
  ) THEN
    ALTER TABLE "attendance_log" ADD COLUMN "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    -- Copy from changedAt if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'attendance_log' AND column_name = 'changedAt'
    ) THEN
      UPDATE "attendance_log" SET "timestamp" = "changedAt";
    END IF;
  END IF;

  -- Add location column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_log' AND column_name = 'location'
  ) THEN
    ALTER TABLE "attendance_log" ADD COLUMN "location" TEXT;
  END IF;

  -- Add ipAddress column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_log' AND column_name = 'ipAddress'
  ) THEN
    ALTER TABLE "attendance_log" ADD COLUMN "ipAddress" VARCHAR(45);
  END IF;

  -- Add userAgent column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_log' AND column_name = 'userAgent'
  ) THEN
    ALTER TABLE "attendance_log" ADD COLUMN "userAgent" TEXT;
  END IF;

  -- Drop old columns if new ones exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'date'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'attendanceDate'
  ) THEN
    ALTER TABLE "attendance" DROP COLUMN IF EXISTS "attendanceDate";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'checkIn'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'checkInTime'
  ) THEN
    ALTER TABLE "attendance" DROP COLUMN IF EXISTS "checkInTime";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'checkOut'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'checkOutTime'
  ) THEN
    ALTER TABLE "attendance" DROP COLUMN IF EXISTS "checkOutTime";
  END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_attendance_date_v2 ON "attendance"("date");
CREATE INDEX IF NOT EXISTS idx_attendance_log_employee ON "attendance_log"("employeeId");
CREATE INDEX IF NOT EXISTS idx_attendance_log_timestamp ON "attendance_log"("timestamp");
CREATE INDEX IF NOT EXISTS idx_attendance_log_type ON "attendance_log"("type");
