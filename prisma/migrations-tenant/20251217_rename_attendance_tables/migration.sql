-- Rename old PascalCase tables to lowercase if they exist
-- This handles the case where old migration already created PascalCase tables

-- First, check and rename AttendanceLog to attendance_log
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'AttendanceLog'
  ) THEN
    ALTER TABLE "AttendanceLog" RENAME TO "attendance_log";
  END IF;
END $$;

-- Rename Attendance to attendance
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'Attendance'
  ) THEN
    ALTER TABLE "Attendance" RENAME TO "attendance";
  END IF;
END $$;

-- Rename Holiday to holiday
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'Holiday'
  ) THEN
    ALTER TABLE "Holiday" RENAME TO "holiday";
  END IF;
END $$;

-- Rename AttendancePeriod to attendance_period
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'AttendancePeriod'
  ) THEN
    ALTER TABLE "AttendancePeriod" RENAME TO "attendance_period";
  END IF;
END $$;

-- If tables don't exist yet, create them with lowercase names
CREATE TABLE IF NOT EXISTS "attendance_period" (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    "startDate" TIMESTAMP NOT NULL,
    "endDate" TIMESTAMP NOT NULL,
    "workingDaysPerWeek" INT DEFAULT 5,
    "workingHoursPerDay" INT DEFAULT 8,
    "workingStartTime" VARCHAR(5) DEFAULT '09:00',
    "workingEndTime" VARCHAR(5) DEFAULT '17:00',
    "allowSaturdayWork" BOOLEAN DEFAULT false,
    "allowSundayWork" BOOLEAN DEFAULT false,
    "lateToleranceMinutes" INT DEFAULT 15,
    "earlyLeaveToleranceMinutes" INT DEFAULT 15,
    description TEXT,
    "isActive" BOOLEAN DEFAULT false,
    "createdBy" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "holiday" (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    "isNational" BOOLEAN DEFAULT false,
    "isRecurring" BOOLEAN DEFAULT false,
    description TEXT,
    "attendancePeriodId" BIGINT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_holiday_attendance_period FOREIGN KEY ("attendancePeriodId") REFERENCES "attendance_period"(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "attendance" (
    id BIGSERIAL PRIMARY KEY,
    "employeeId" BIGINT NOT NULL,
    "attendancePeriodId" BIGINT NOT NULL,
    "attendanceDate" DATE NOT NULL,
    "checkInTime" TIMESTAMP,
    "checkOutTime" TIMESTAMP,
    status VARCHAR(50),
    notes TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_attendance_employee FOREIGN KEY ("employeeId") REFERENCES "employees"(id) ON DELETE CASCADE,
    CONSTRAINT fk_attendance_period FOREIGN KEY ("attendancePeriodId") REFERENCES "attendance_period"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "attendance_log" (
    id BIGSERIAL PRIMARY KEY,
    "attendanceId" BIGINT NOT NULL,
    action VARCHAR(100) NOT NULL,
    "changedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "changedBy" VARCHAR(255),
    "oldValue" TEXT,
    "newValue" TEXT,
    CONSTRAINT fk_attendance_log_attendance FOREIGN KEY ("attendanceId") REFERENCES "attendance"(id) ON DELETE CASCADE
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_attendance_period_active ON "attendance_period"("isActive");
CREATE INDEX IF NOT EXISTS idx_attendance_period_dates ON "attendance_period"("startDate", "endDate");
CREATE INDEX IF NOT EXISTS idx_holiday_period ON "holiday"("attendancePeriodId");
CREATE INDEX IF NOT EXISTS idx_holiday_date ON "holiday"(date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON "attendance"("employeeId");
CREATE INDEX IF NOT EXISTS idx_attendance_period ON "attendance"("attendancePeriodId");
CREATE INDEX IF NOT EXISTS idx_attendance_date ON "attendance"("attendanceDate");
CREATE INDEX IF NOT EXISTS idx_attendance_log_attendance ON "attendance_log"("attendanceId");
CREATE INDEX IF NOT EXISTS idx_attendance_log_action ON "attendance_log"(action);
