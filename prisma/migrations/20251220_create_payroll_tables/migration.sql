-- Create payrolls table
CREATE TABLE IF NOT EXISTS "payrolls" (
    id BIGSERIAL PRIMARY KEY,
    "employeeId" BIGINT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "baseSalary" DECIMAL(15,2) NOT NULL,
    "overtimePay" DECIMAL(15,2) DEFAULT 0,
    deductions DECIMAL(15,2) DEFAULT 0,
    bonuses DECIMAL(15,2) DEFAULT 0,
    "grossSalary" DECIMAL(15,2) NOT NULL,
    "netSalary" DECIMAL(15,2) NOT NULL,
    "overtimeHours" DECIMAL(10,2) DEFAULT 0,
    "regularHours" DECIMAL(10,2) DEFAULT 0,
    "isPaid" BOOLEAN DEFAULT false,
    "processedAt" TIMESTAMP,
    "processedBy" BIGINT,
    notes TEXT,
    "paidAt" TIMESTAMP,
    "processorId" BIGINT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payrolls_employee FOREIGN KEY ("employeeId") REFERENCES "employees"(id) ON DELETE CASCADE,
    CONSTRAINT fk_payrolls_processor FOREIGN KEY ("processorId") REFERENCES "users"(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX idx_payrolls_employee ON "payrolls"("employeeId");
CREATE INDEX idx_payrolls_period ON "payrolls"("periodStart", "periodEnd");
CREATE INDEX idx_payrolls_paid ON "payrolls"("isPaid");
CREATE INDEX idx_payrolls_employee_period ON "payrolls"("employeeId", "periodStart" DESC);
CREATE INDEX idx_payrolls_processed ON "payrolls"("processedAt");
