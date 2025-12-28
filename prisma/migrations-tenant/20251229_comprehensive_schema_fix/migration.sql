-- ========================================
-- COMPREHENSIVE SCHEMA FIX MIGRATION
-- Date: 2025-12-29
-- Description: Fix all schema inconsistencies between database-tenant.service.ts and actual database
-- ========================================

-- ========================================
-- 1. FIX ATTENDANCE_PERIOD TABLE
-- ========================================
DO $$ 
BEGIN
  -- Change startDate from DATE to TIMESTAMP if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_period' 
    AND column_name = 'startDate' 
    AND data_type = 'date'
  ) THEN
    ALTER TABLE "attendance_period" 
    ALTER COLUMN "startDate" TYPE TIMESTAMP USING "startDate"::timestamp;
  END IF;

  -- Change endDate from DATE to TIMESTAMP if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_period' 
    AND column_name = 'endDate' 
    AND data_type = 'date'
  ) THEN
    ALTER TABLE "attendance_period" 
    ALTER COLUMN "endDate" TYPE TIMESTAMP USING "endDate"::timestamp;
  END IF;

  -- Add workingDaysPerWeek column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_period' AND column_name = 'workingDaysPerWeek'
  ) THEN
    ALTER TABLE "attendance_period" ADD COLUMN "workingDaysPerWeek" INTEGER DEFAULT 5;
  END IF;

  -- Add workingHoursPerDay column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_period' AND column_name = 'workingHoursPerDay'
  ) THEN
    ALTER TABLE "attendance_period" ADD COLUMN "workingHoursPerDay" INTEGER DEFAULT 8;
  END IF;

  -- Add workingStartTime column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_period' AND column_name = 'workingStartTime'
  ) THEN
    ALTER TABLE "attendance_period" ADD COLUMN "workingStartTime" VARCHAR(5) DEFAULT '09:00';
  END IF;

  -- Add workingEndTime column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_period' AND column_name = 'workingEndTime'
  ) THEN
    ALTER TABLE "attendance_period" ADD COLUMN "workingEndTime" VARCHAR(5) DEFAULT '17:00';
  END IF;

  -- Add allowSaturdayWork column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_period' AND column_name = 'allowSaturdayWork'
  ) THEN
    ALTER TABLE "attendance_period" ADD COLUMN "allowSaturdayWork" BOOLEAN DEFAULT false;
  END IF;

  -- Add allowSundayWork column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_period' AND column_name = 'allowSundayWork'
  ) THEN
    ALTER TABLE "attendance_period" ADD COLUMN "allowSundayWork" BOOLEAN DEFAULT false;
  END IF;

  -- Add lateToleranceMinutes column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_period' AND column_name = 'lateToleranceMinutes'
  ) THEN
    ALTER TABLE "attendance_period" ADD COLUMN "lateToleranceMinutes" INTEGER DEFAULT 15;
  END IF;

  -- Add earlyLeaveToleranceMinutes column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_period' AND column_name = 'earlyLeaveToleranceMinutes'
  ) THEN
    ALTER TABLE "attendance_period" ADD COLUMN "earlyLeaveToleranceMinutes" INTEGER DEFAULT 15;
  END IF;

  -- Add description column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_period' AND column_name = 'description'
  ) THEN
    ALTER TABLE "attendance_period" ADD COLUMN "description" TEXT;
  END IF;

  -- Add createdBy column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_period' AND column_name = 'createdBy'
  ) THEN
    ALTER TABLE "attendance_period" ADD COLUMN "createdBy" VARCHAR(255);
  END IF;

  -- Update isActive column default
  ALTER TABLE "attendance_period" ALTER COLUMN "isActive" SET DEFAULT false;

  -- Drop workDays column if it exists (old schema)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_period' AND column_name = 'workDays'
  ) THEN
    ALTER TABLE "attendance_period" DROP COLUMN "workDays";
  END IF;
END $$;

-- ========================================
-- 2. FIX HOLIDAY TABLE
-- ========================================
DO $$ 
BEGIN
  -- Add isNational column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'holiday' AND column_name = 'isNational'
  ) THEN
    ALTER TABLE "holiday" ADD COLUMN "isNational" BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added isNational column to holiday table';
  END IF;

  -- Add description column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'holiday' AND column_name = 'description'
  ) THEN
    ALTER TABLE "holiday" ADD COLUMN "description" TEXT;
    RAISE NOTICE 'Added description column to holiday table';
  END IF;

  -- Make attendancePeriodId nullable if it's not
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'holiday' 
    AND column_name = 'attendancePeriodId'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "holiday" ALTER COLUMN "attendancePeriodId" DROP NOT NULL;
    RAISE NOTICE 'Made attendancePeriodId nullable in holiday table';
  END IF;

  -- Update foreign key constraint to ON DELETE SET NULL if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'holiday_attendancePeriodId_fkey' 
    AND table_name = 'holiday'
  ) THEN
    ALTER TABLE "holiday" DROP CONSTRAINT "holiday_attendancePeriodId_fkey";
    ALTER TABLE "holiday" 
    ADD CONSTRAINT "holiday_attendancePeriodId_fkey" 
    FOREIGN KEY ("attendancePeriodId") REFERENCES "attendance_period"("id") ON DELETE SET NULL;
    RAISE NOTICE 'Updated foreign key constraint on holiday table';
  END IF;

  -- Also check for old constraint names
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_holiday_attendance_period' 
    AND table_name = 'holiday'
  ) THEN
    ALTER TABLE "holiday" DROP CONSTRAINT "fk_holiday_attendance_period";
    ALTER TABLE "holiday" 
    ADD CONSTRAINT "holiday_attendancePeriodId_fkey" 
    FOREIGN KEY ("attendancePeriodId") REFERENCES "attendance_period"("id") ON DELETE SET NULL;
    RAISE NOTICE 'Updated old foreign key constraint on holiday table';
  END IF;
END $$;

-- ========================================
-- 3. FIX OVERTIME_REQUEST FOREIGN KEY
-- ========================================
DO $$ 
BEGIN
  -- Drop the old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_overtime_request_attendance' 
    AND table_name = 'overtime_request'
  ) THEN
    ALTER TABLE "overtime_request" DROP CONSTRAINT "fk_overtime_request_attendance";
    RAISE NOTICE 'Dropped old overtime_request foreign key constraint';
  END IF;

  -- Add the correct constraint if attendances table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'attendances'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'overtime_request'
  ) THEN
    ALTER TABLE "overtime_request" 
    ADD CONSTRAINT "fk_overtime_request_attendance" 
    FOREIGN KEY ("attendanceId") REFERENCES "attendances"("id") ON DELETE SET NULL;
    RAISE NOTICE 'Added corrected overtime_request foreign key constraint';
  END IF;
END $$;

-- ========================================
-- 4. ENSURE ATTENDANCE TABLE IS NAMED 'attendances' (plural)
-- ========================================
DO $$ 
BEGIN
  -- Rename table if still named 'attendance' (singular)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'attendance'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'attendances'
  ) THEN
    ALTER TABLE "attendance" RENAME TO "attendances";
    RAISE NOTICE 'Renamed attendance table to attendances';
  END IF;
END $$;

-- ========================================
-- 5. ADD MISSING COLUMNS TO ATTENDANCES TABLE
-- ========================================
DO $$ 
BEGIN
  -- Rename attendanceDate to date if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendances' AND column_name = 'attendanceDate'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendances' AND column_name = 'date'
  ) THEN
    ALTER TABLE "attendances" RENAME COLUMN "attendanceDate" TO "date";
    RAISE NOTICE 'Renamed attendanceDate to date in attendances table';
  END IF;

  -- Rename checkInTime to checkIn if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendances' AND column_name = 'checkInTime'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendances' AND column_name = 'checkIn'
  ) THEN
    ALTER TABLE "attendances" RENAME COLUMN "checkInTime" TO "checkIn";
    RAISE NOTICE 'Renamed checkInTime to checkIn in attendances table';
  END IF;

  -- Rename checkOutTime to checkOut if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendances' AND column_name = 'checkOutTime'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendances' AND column_name = 'checkOut'
  ) THEN
    ALTER TABLE "attendances" RENAME COLUMN "checkOutTime" TO "checkOut";
    RAISE NOTICE 'Renamed checkOutTime to checkOut in attendances table';
  END IF;

  -- Add checkInLocation column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendances' AND column_name = 'checkInLocation'
  ) THEN
    ALTER TABLE "attendances" ADD COLUMN "checkInLocation" TEXT;
    RAISE NOTICE 'Added checkInLocation to attendances table';
  END IF;

  -- Add checkOutLocation column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendances' AND column_name = 'checkOutLocation'
  ) THEN
    ALTER TABLE "attendances" ADD COLUMN "checkOutLocation" TEXT;
    RAISE NOTICE 'Added checkOutLocation to attendances table';
  END IF;

  -- Add workDuration column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendances' AND column_name = 'workDuration'
  ) THEN
    ALTER TABLE "attendances" ADD COLUMN "workDuration" INTEGER;
    RAISE NOTICE 'Added workDuration to attendances table';
  END IF;

  -- Make status NOT NULL if it's nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendances' 
    AND column_name = 'status'
    AND is_nullable = 'YES'
  ) THEN
    UPDATE "attendances" SET "status" = 'PRESENT' WHERE "status" IS NULL;
    ALTER TABLE "attendances" ALTER COLUMN "status" SET NOT NULL;
    RAISE NOTICE 'Made status NOT NULL in attendances table';
  END IF;
END $$;

-- ========================================
-- FINAL: Log completion
-- ========================================
DO $$ 
BEGIN
  RAISE NOTICE '✅ Comprehensive schema fix migration completed successfully';
END $$;
