-- Create payslips table
CREATE TABLE IF NOT EXISTS "payslips" (
    id BIGSERIAL PRIMARY KEY,
    "payrollId" BIGINT NOT NULL UNIQUE,
    "grossSalary" DECIMAL(15,2) NOT NULL,
    "overtimePay" DECIMAL(15,2) DEFAULT 0,
    bonuses DECIMAL(15,2) DEFAULT 0,
    allowances DECIMAL(15,2) DEFAULT 0,
    "taxAmount" DECIMAL(15,2) DEFAULT 0,
    "bpjsKesehatanEmployee" DECIMAL(15,2) DEFAULT 0,
    "bpjsKesehatanCompany" DECIMAL(15,2) DEFAULT 0,
    "bpjsKetenagakerjaanEmployee" DECIMAL(15,2) DEFAULT 0,
    "bpjsKetenagakerjaanCompany" DECIMAL(15,2) DEFAULT 0,
    "otherDeductions" DECIMAL(15,2) DEFAULT 0,
    "takeHomePay" DECIMAL(15,2) NOT NULL,
    "taxCalculationDetails" JSONB,
    "pdfUrl" TEXT,
    "generatedBy" BIGINT NOT NULL,
    "generatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payslips_payroll FOREIGN KEY ("payrollId") REFERENCES "payrolls"(id) ON DELETE CASCADE,
    CONSTRAINT fk_payslips_generator FOREIGN KEY ("generatedBy") REFERENCES "users"(id) ON DELETE RESTRICT
);

-- Create payroll_deductions table
CREATE TABLE IF NOT EXISTS "payroll_deductions" (
    id BIGSERIAL PRIMARY KEY,
    "payslipId" BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_deductions_payslip FOREIGN KEY ("payslipId") REFERENCES "payslips"(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_payslips_payroll ON "payslips"("payrollId");
CREATE INDEX idx_payslips_generated_at ON "payslips"("generatedAt" DESC);
CREATE INDEX idx_payslips_generator ON "payslips"("generatedBy");
CREATE INDEX idx_deductions_payslip ON "payroll_deductions"("payslipId");
CREATE INDEX idx_deductions_type ON "payroll_deductions"(type);
