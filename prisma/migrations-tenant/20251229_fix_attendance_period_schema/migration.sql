-- Fix attendance_period table schema to match service expectations
-- This migration adds missing columns that are required by the service

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

  -- Update isActive column default if it exists but has wrong default
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_period' AND column_name = 'isActive'
  ) THEN
    ALTER TABLE "attendance_period" ALTER COLUMN "isActive" SET DEFAULT false;
  END IF;

  -- Drop workDays column if it exists (old schema)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_period' AND column_name = 'workDays'
  ) THEN
    ALTER TABLE "attendance_period" DROP COLUMN "workDays";
  END IF;
END $$;

-- Update createdAt and updatedAt columns if they have wrong type
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_period' 
    AND column_name = 'createdAt'
  ) THEN
    ALTER TABLE "attendance_period" 
    ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_period' 
    AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "attendance_period" 
    ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
