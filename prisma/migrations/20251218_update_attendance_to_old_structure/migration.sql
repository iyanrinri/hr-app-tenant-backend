-- Update attendance table to match old structure
-- This migration renames columns and adds missing fields

DO $$ 
BEGIN
  -- Rename attendanceDate to date if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'attendanceDate'
  ) THEN
    ALTER TABLE "attendance" RENAME COLUMN "attendanceDate" TO "date";
  END IF;

  -- Rename checkInTime to checkIn if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'checkInTime'
  ) THEN
    ALTER TABLE "attendance" RENAME COLUMN "checkInTime" TO "checkIn";
  END IF;

  -- Rename checkOutTime to checkOut if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'checkOutTime'
  ) THEN
    ALTER TABLE "attendance" RENAME COLUMN "checkOutTime" TO "checkOut";
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
    ALTER TABLE "attendance" ADD COLUMN "workDuration" INTEGER;
  END IF;
END $$;

-- Rename table to attendances (plural) if still named attendance
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'attendance'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'attendances'
  ) THEN
    ALTER TABLE "attendance" RENAME TO "attendances";
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendances_date ON "attendances"("date");
CREATE INDEX IF NOT EXISTS idx_attendances_employee_date ON "attendances"("employeeId", "date");
