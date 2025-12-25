-- Create attendance_period table
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

-- Create holiday table
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

-- Create attendance table
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

-- Create attendance_log table for audit trail
CREATE TABLE IF NOT EXISTS "attendance_log" (
    id BIGSERIAL PRIMARY KEY,
    "attendanceId" BIGINT NOT NULL,
    "employeeId" BIGINT NOT NULL,
    action VARCHAR(100),
    "oldValues" JSONB,
    "newValues" JSONB,
    "modifiedBy" VARCHAR(255),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_attendance_log_attendance FOREIGN KEY ("attendanceId") REFERENCES "attendance"(id) ON DELETE CASCADE,
    CONSTRAINT fk_attendance_log_employee FOREIGN KEY ("employeeId") REFERENCES "employees"(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_period_active ON "attendance_period"("isActive");

CREATE INDEX IF NOT EXISTS idx_attendance_period_dates ON "attendance_period"("startDate", "endDate");

CREATE INDEX IF NOT EXISTS idx_holiday_date ON "holiday"(date);

CREATE INDEX IF NOT EXISTS idx_holiday_attendance_period ON "holiday"("attendancePeriodId");

CREATE INDEX IF NOT EXISTS idx_attendance_employee_period ON "attendance"("employeeId", "attendancePeriodId");

CREATE INDEX IF NOT EXISTS idx_attendance_date ON "attendance"("attendanceDate");

CREATE INDEX IF NOT EXISTS idx_attendance_status ON "attendance"(status);

CREATE INDEX IF NOT EXISTS idx_attendance_log_attendance ON "attendance_log"("attendanceId");

CREATE INDEX IF NOT EXISTS idx_attendance_log_employee ON "attendance_log"("employeeId");
