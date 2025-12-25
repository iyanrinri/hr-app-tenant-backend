-- Migration: Create Overtime Tables
-- Description: Creates overtime_request and overtime_approval tables in tenant databases

-- Create ApprovalStatus enum if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ApprovalStatus') THEN
        CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    END IF;
END $$;

-- Create OvertimeStatus enum
CREATE TYPE "OvertimeStatus" AS ENUM ('PENDING', 'MANAGER_APPROVED', 'HR_APPROVED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- Create overtime_request table
CREATE TABLE IF NOT EXISTS "overtime_request" (
    id BIGSERIAL PRIMARY KEY,
    "employeeId" BIGINT NOT NULL,
    "attendanceId" BIGINT,
    date DATE NOT NULL,
    "startTime" TIMESTAMP NOT NULL,
    "endTime" TIMESTAMP NOT NULL,
    "totalMinutes" INT NOT NULL,
    reason TEXT NOT NULL,
    status "OvertimeStatus" DEFAULT 'PENDING',
    "overtimeRate" DECIMAL(10,2),
    "calculatedAmount" DECIMAL(12,2),
    "managerComments" TEXT,
    "hrComments" TEXT,
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "managerApprovedAt" TIMESTAMP,
    "hrApprovedAt" TIMESTAMP,
    "finalizedAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_overtime_request_employee FOREIGN KEY ("employeeId") REFERENCES "employees"(id) ON DELETE CASCADE,
    CONSTRAINT fk_overtime_request_attendance FOREIGN KEY ("attendanceId") REFERENCES "attendance"(id) ON DELETE SET NULL
);

-- Create overtime_approval table
CREATE TABLE IF NOT EXISTS "overtime_approval" (
    id BIGSERIAL PRIMARY KEY,
    "overtimeRequestId" BIGINT NOT NULL,
    "approverId" BIGINT NOT NULL,
    "approverType" VARCHAR(20) NOT NULL,
    status "ApprovalStatus" DEFAULT 'PENDING',
    comments TEXT,
    "approvedAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_overtime_approval_request FOREIGN KEY ("overtimeRequestId") REFERENCES "overtime_request"(id) ON DELETE CASCADE,
    CONSTRAINT fk_overtime_approval_approver FOREIGN KEY ("approverId") REFERENCES "employees"(id) ON DELETE CASCADE,
    UNIQUE ("overtimeRequestId", "approverId", "approverType")
);

-- Create indexes for better performance
CREATE INDEX idx_overtime_request_employee ON "overtime_request"("employeeId");
CREATE INDEX idx_overtime_request_status ON "overtime_request"(status);
CREATE INDEX idx_overtime_request_date ON "overtime_request"(date);
CREATE INDEX idx_overtime_request_attendance ON "overtime_request"("attendanceId");
CREATE INDEX idx_overtime_request_submitted ON "overtime_request"("submittedAt");

CREATE INDEX idx_overtime_approval_request ON "overtime_approval"("overtimeRequestId");
CREATE INDEX idx_overtime_approval_approver ON "overtime_approval"("approverId");
CREATE INDEX idx_overtime_approval_status ON "overtime_approval"(status);

-- Add comments
COMMENT ON TABLE "overtime_request" IS 'Stores employee overtime requests';
COMMENT ON TABLE "overtime_approval" IS 'Stores approval records for overtime requests';

COMMENT ON COLUMN "overtime_request"."totalMinutes" IS 'Total overtime duration in minutes';
COMMENT ON COLUMN "overtime_request"."overtimeRate" IS 'Rate per hour for overtime calculation';
COMMENT ON COLUMN "overtime_request"."calculatedAmount" IS 'Calculated overtime payment amount';
