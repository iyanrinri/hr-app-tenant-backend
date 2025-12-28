-- Fix holiday table schema to match service expectations
-- This migration adds missing columns that are required by the service

DO $$ 
BEGIN
  -- Add isNational column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'holiday' AND column_name = 'isNational'
  ) THEN
    ALTER TABLE "holiday" ADD COLUMN "isNational" BOOLEAN DEFAULT false;
  END IF;

  -- Add description column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'holiday' AND column_name = 'description'
  ) THEN
    ALTER TABLE "holiday" ADD COLUMN "description" TEXT;
  END IF;

  -- Make attendancePeriodId nullable if it's not
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'holiday' 
    AND column_name = 'attendancePeriodId'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "holiday" ALTER COLUMN "attendancePeriodId" DROP NOT NULL;
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
  END IF;
END $$;
