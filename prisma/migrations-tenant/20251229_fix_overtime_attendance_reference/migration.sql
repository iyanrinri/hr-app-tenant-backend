-- Fix overtime_request foreign key reference from attendance to attendances
-- This migration fixes the foreign key reference to match the actual table name

DO $$ 
BEGIN
  -- Drop the old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_overtime_request_attendance' 
    AND table_name = 'overtime_request'
  ) THEN
    ALTER TABLE "overtime_request" DROP CONSTRAINT "fk_overtime_request_attendance";
  END IF;

  -- Add the correct constraint if attendances table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'attendances'
  ) THEN
    ALTER TABLE "overtime_request" 
    ADD CONSTRAINT "fk_overtime_request_attendance" 
    FOREIGN KEY ("attendanceId") REFERENCES "attendances"("id") ON DELETE SET NULL;
  END IF;
END $$;
