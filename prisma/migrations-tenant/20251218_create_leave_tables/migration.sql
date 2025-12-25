-- Create LeaveType enum
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'HAJJ_UMRAH', 'EMERGENCY', 'COMPASSIONATE', 'STUDY', 'UNPAID');

-- Create LeaveRequestStatus enum
CREATE TYPE "LeaveRequestStatus" AS ENUM ('PENDING', 'MANAGER_APPROVED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- Create leave_period table
CREATE TABLE IF NOT EXISTS "leave_period" (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "isActive" BOOLEAN DEFAULT false,
    description TEXT,
    "createdBy" BIGINT NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create leave_type_config table
CREATE TABLE IF NOT EXISTS "leave_type_config" (
    id BIGSERIAL PRIMARY KEY,
    "leavePeriodId" BIGINT NOT NULL,
    type "LeaveType" NOT NULL,
    name VARCHAR(255) NOT NULL,
    "defaultQuota" INT NOT NULL,
    "maxConsecutiveDays" INT,
    "advanceNoticeDays" INT,
    "isCarryForward" BOOLEAN DEFAULT false,
    "maxCarryForward" INT,
    "requiresApproval" BOOLEAN DEFAULT true,
    "allowNegativeBalance" BOOLEAN DEFAULT false,
    description TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_leave_type_config_period FOREIGN KEY ("leavePeriodId") REFERENCES "leave_period"(id) ON DELETE CASCADE,
    CONSTRAINT unique_leave_type_per_period UNIQUE ("leavePeriodId", type)
);

-- Create leave_balance table
CREATE TABLE IF NOT EXISTS "leave_balance" (
    id BIGSERIAL PRIMARY KEY,
    "employeeId" BIGINT NOT NULL,
    "leavePeriodId" BIGINT NOT NULL,
    "leaveTypeConfigId" BIGINT NOT NULL,
    "totalQuota" INT NOT NULL DEFAULT 0,
    "usedQuota" DECIMAL(5,2) DEFAULT 0,
    "pendingQuota" DECIMAL(5,2) DEFAULT 0,
    "adjustmentQuota" INT DEFAULT 0,
    "carriedForwardQuota" INT DEFAULT 0,
    "remainingQuota" DECIMAL(5,2) DEFAULT 0,
    "lastUpdated" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_leave_balance_employee FOREIGN KEY ("employeeId") REFERENCES "employees"(id) ON DELETE CASCADE,
    CONSTRAINT fk_leave_balance_period FOREIGN KEY ("leavePeriodId") REFERENCES "leave_period"(id) ON DELETE CASCADE,
    CONSTRAINT fk_leave_balance_type_config FOREIGN KEY ("leaveTypeConfigId") REFERENCES "leave_type_config"(id) ON DELETE CASCADE,
    CONSTRAINT unique_employee_period_type UNIQUE ("employeeId", "leavePeriodId", "leaveTypeConfigId")
);

-- Create leave_request table
CREATE TABLE IF NOT EXISTS "leave_request" (
    id BIGSERIAL PRIMARY KEY,
    "employeeId" BIGINT NOT NULL,
    "leaveTypeConfigId" BIGINT NOT NULL,
    "leavePeriodId" BIGINT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "totalDays" DECIMAL(5,2) NOT NULL,
    reason TEXT NOT NULL,
    status "LeaveRequestStatus" DEFAULT 'PENDING',
    "managerApprovedBy" BIGINT,
    "managerApprovedAt" TIMESTAMP,
    "managerNotes" TEXT,
    "hrApprovedBy" BIGINT,
    "hrApprovedAt" TIMESTAMP,
    "hrNotes" TEXT,
    "rejectedBy" BIGINT,
    "rejectedAt" TIMESTAMP,
    "rejectionReason" TEXT,
    "cancelledAt" TIMESTAMP,
    "cancellationReason" TEXT,
    "submittedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_leave_request_employee FOREIGN KEY ("employeeId") REFERENCES "employees"(id) ON DELETE CASCADE,
    CONSTRAINT fk_leave_request_type_config FOREIGN KEY ("leaveTypeConfigId") REFERENCES "leave_type_config"(id) ON DELETE RESTRICT,
    CONSTRAINT fk_leave_request_period FOREIGN KEY ("leavePeriodId") REFERENCES "leave_period"(id) ON DELETE RESTRICT
);

-- Create indexes for better performance
CREATE INDEX idx_leave_period_active ON "leave_period"("isActive");
CREATE INDEX idx_leave_period_dates ON "leave_period"("startDate", "endDate");

CREATE INDEX idx_leave_type_config_period ON "leave_type_config"("leavePeriodId");
CREATE INDEX idx_leave_type_config_type ON "leave_type_config"(type);
CREATE INDEX idx_leave_type_config_active ON "leave_type_config"("isActive");

CREATE INDEX idx_leave_balance_employee ON "leave_balance"("employeeId");
CREATE INDEX idx_leave_balance_period ON "leave_balance"("leavePeriodId");
CREATE INDEX idx_leave_balance_type_config ON "leave_balance"("leaveTypeConfigId");

CREATE INDEX idx_leave_request_employee ON "leave_request"("employeeId");
CREATE INDEX idx_leave_request_status ON "leave_request"(status);
CREATE INDEX idx_leave_request_dates ON "leave_request"("startDate", "endDate");
CREATE INDEX idx_leave_request_period ON "leave_request"("leavePeriodId");
CREATE INDEX idx_leave_request_type_config ON "leave_request"("leaveTypeConfigId");
