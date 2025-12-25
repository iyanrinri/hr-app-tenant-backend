-- Create SalaryChangeType enum
CREATE TYPE "SalaryChangeType" AS ENUM ('INITIAL', 'PROMOTION', 'GRADE_ADJUSTMENT', 'PERFORMANCE_INCREASE', 'MARKET_ADJUSTMENT', 'DEPARTMENT_TRANSFER', 'POSITION_CHANGE', 'ANNUAL_INCREMENT');

-- Create salaries table
CREATE TABLE "salaries" (
    id BIGSERIAL PRIMARY KEY,
    "employeeId" BIGINT NOT NULL,
    "baseSalary" DECIMAL(15,2) NOT NULL,
    allowances DECIMAL(15,2) DEFAULT 0,
    grade VARCHAR(50),
    "effectiveDate" DATE NOT NULL,
    "endDate" DATE,
    "isActive" BOOLEAN DEFAULT true,
    notes TEXT,
    "createdBy" BIGINT NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_salaries_employee FOREIGN KEY ("employeeId") REFERENCES "employees"(id)
);

-- Create salary_histories table
CREATE TABLE "salary_histories" (
    id BIGSERIAL PRIMARY KEY,
    "employeeId" BIGINT NOT NULL,
    "changeType" "SalaryChangeType" NOT NULL,
    "oldBaseSalary" DECIMAL(15,2),
    "newBaseSalary" DECIMAL(15,2) NOT NULL,
    "oldGrade" VARCHAR(50),
    "newGrade" VARCHAR(50),
    "oldPosition" VARCHAR(255),
    "newPosition" VARCHAR(255),
    "oldDepartment" VARCHAR(255),
    "newDepartment" VARCHAR(255),
    reason TEXT NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "approvedBy" BIGINT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_salary_histories_employee FOREIGN KEY ("employeeId") REFERENCES "employees"(id)
);

-- Create indexes for better performance
CREATE INDEX idx_salaries_employee_id ON "salaries"("employeeId");
CREATE INDEX idx_salaries_is_active ON "salaries"("isActive");
CREATE INDEX idx_salaries_effective_date ON "salaries"("effectiveDate");
CREATE INDEX idx_salary_histories_employee_id ON "salary_histories"("employeeId");
CREATE INDEX idx_salary_histories_change_type ON "salary_histories"("changeType");
