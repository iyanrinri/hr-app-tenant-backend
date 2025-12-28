import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as pg from 'pg';

@Injectable()
export class DatabaseTenantService {
  private logger = new Logger(DatabaseTenantService.name);
  private pool: pg.Pool;

  constructor(private configService: ConfigService) {
    this.pool = new pg.Pool({
      user: this.configService.get<string>('DB_USER') || 'hrapp',
      password: this.configService.get<string>('DB_PASSWORD') || 'hrapp123',
      host: this.configService.get<string>('DB_HOST') || 'localhost',
      port: this.configService.get<number>('DB_PORT') || 5432,
      database: 'postgres', // Connect to default postgres database for admin operations
    });
  }

  async createTenantDatabase(
    tenantSlug: string,
    seedData?: {
      email: string;
      firstName: string;
      lastName: string;
      password: string;
      role: string;
    },
  ): Promise<void> {
    const databaseName = `${tenantSlug}_erp`;
    const client = await this.pool.connect();

    try {
      // Check if database already exists
      const result = await client.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [databaseName],
      );

      if (result.rows.length > 0) {
        this.logger.warn(`Database ${databaseName} already exists`);
        return;
      }

      // Create database
      await client.query(`CREATE DATABASE "${databaseName}"`);
      this.logger.log(`Database ${databaseName} created successfully`);

      // Create schema on the new database
      await this.createTenantSchema(databaseName, seedData);
    } catch (error) {
      this.logger.error(`Error creating database ${databaseName}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  private async createTenantSchema(
    databaseName: string,
    seedData?: {
      email: string;
      firstName: string;
      lastName: string;
      password: string;
      role: string;
    },
  ): Promise<void> {
    const dbUser = this.configService.get<string>('DB_USER') || 'hrapp';
    const dbPassword = this.configService.get<string>('DB_PASSWORD') || 'hrapp123';
    const dbHost = this.configService.get<string>('DB_HOST') || 'localhost';
    const dbPort = this.configService.get<number>('DB_PORT') || 5432;

    const tenantPool = new pg.Pool({
      user: dbUser,
      password: dbPassword,
      host: dbHost,
      port: dbPort,
      database: databaseName,
    });

    const tenantClient = await tenantPool.connect();

    try {
      // Create Role enum
      await tenantClient.query(`
        DO $$ BEGIN
          CREATE TYPE "Role" AS ENUM ('ADMIN', 'HR', 'MANAGER', 'EMPLOYEE');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // Create SalaryChangeType enum
      await tenantClient.query(`
        DO $$ BEGIN
          CREATE TYPE "SalaryChangeType" AS ENUM ('INITIAL', 'PROMOTION', 'GRADE_ADJUSTMENT', 'PERFORMANCE_INCREASE', 'MARKET_ADJUSTMENT', 'DEPARTMENT_TRANSFER', 'POSITION_CHANGE', 'ANNUAL_INCREMENT');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // Create users table
      await tenantClient.query(`
        CREATE TABLE IF NOT EXISTS "users" (
          "id" BIGSERIAL NOT NULL,
          "email" TEXT NOT NULL UNIQUE,
          "password" TEXT NOT NULL,
          "firstName" TEXT NOT NULL,
          "lastName" TEXT NOT NULL,
          "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "deletedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "users_pkey" PRIMARY KEY ("id")
        );
      `);

      // Create employees table with enhanced schema
      await tenantClient.query(`
        CREATE TABLE IF NOT EXISTS "employees" (
          "id" BIGSERIAL NOT NULL,
          "userId" BIGINT,
          "managerId" BIGINT,
          
          -- Basic Information
          "firstName" TEXT NOT NULL,
          "lastName" TEXT NOT NULL,
          "position" TEXT NOT NULL,
          "department" TEXT NOT NULL,
          "joinDate" TIMESTAMP(3) NOT NULL,
          
          -- Personal Information
          "employeeNumber" TEXT UNIQUE,
          "dateOfBirth" TIMESTAMP(3),
          "gender" TEXT,
          "maritalStatus" TEXT,
          "nationality" TEXT,
          "religion" TEXT,
          "bloodType" TEXT,
          "idNumber" TEXT UNIQUE,
          "taxNumber" TEXT UNIQUE,
          
          -- Contact Information
          "phoneNumber" TEXT,
          "alternativePhone" TEXT,
          "address" TEXT,
          "city" TEXT,
          "province" TEXT,
          "postalCode" TEXT,
          "emergencyContactName" TEXT,
          "emergencyContactPhone" TEXT,
          "emergencyContactRelation" TEXT,
          
          -- Bank Information
          "bankName" TEXT,
          "bankAccountNumber" TEXT,
          "bankAccountName" TEXT,
          
          -- Employment Details
          "employmentStatus" TEXT,
          "contractStartDate" TIMESTAMP(3),
          "contractEndDate" TIMESTAMP(3),
          "workLocation" TEXT,
          "baseSalary" NUMERIC(15, 2),
          
          -- Profile
          "profilePicture" TEXT,
          
          -- Status & Audit
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "deletedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          
          CONSTRAINT "employees_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "employees_userId_unique" UNIQUE ("userId"),
          CONSTRAINT "employees_managerId_fk" FOREIGN KEY ("managerId") REFERENCES "employees"("id") ON DELETE SET NULL
        );
      `);

      // Create indexes
      await tenantClient.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
      `);

      await tenantClient.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "employees_userId_unique" ON "employees"("userId");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "employees_firstName_idx" ON "employees"("firstName");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "employees_lastName_idx" ON "employees"("lastName");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "employees_position_idx" ON "employees"("position");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "employees_department_idx" ON "employees"("department");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "employees_managerId_idx" ON "employees"("managerId");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "employees_isActive_idx" ON "employees"("isActive");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "employees_deletedAt_idx" ON "employees"("deletedAt");
      `);

      // Create foreign key
      await tenantClient.query(`
        DO $$ BEGIN
          ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // Create salaries table
      await tenantClient.query(`
        CREATE TABLE IF NOT EXISTS "salaries" (
          "id" BIGSERIAL NOT NULL,
          "employeeId" BIGINT NOT NULL,
          "baseSalary" DECIMAL(15,2) NOT NULL,
          allowances DECIMAL(15,2) DEFAULT 0,
          grade VARCHAR(50),
          "effectiveDate" DATE NOT NULL,
          "endDate" DATE,
          "isActive" BOOLEAN DEFAULT true,
          notes TEXT,
          "createdBy" BIGINT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "salaries_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "salaries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE
        );
      `);

      // Create salary_histories table
      await tenantClient.query(`
        CREATE TABLE IF NOT EXISTS "salary_histories" (
          "id" BIGSERIAL NOT NULL,
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
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "salary_histories_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "salary_histories_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE
        );
      `);

      // Create indexes for salaries
      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_salaries_employee_id" ON "salaries"("employeeId");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_salaries_is_active" ON "salaries"("isActive");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_salaries_effective_date" ON "salaries"("effectiveDate");
      `);

      // Create indexes for salary_histories
      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_salary_histories_employee_id" ON "salary_histories"("employeeId");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_salary_histories_change_type" ON "salary_histories"("changeType");
      `);

      // Create SettingCategory and SettingDataType enums
      await tenantClient.query(`
        DO $$ BEGIN
          CREATE TYPE "SettingCategory" AS ENUM ('COMPANY', 'ATTENDANCE', 'GENERAL', 'NOTIFICATION', 'SECURITY');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      await tenantClient.query(`
        DO $$ BEGIN
          CREATE TYPE "SettingDataType" AS ENUM ('STRING', 'INTEGER', 'BOOLEAN', 'JSON');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // Create settings table
      await tenantClient.query(`
        CREATE TABLE IF NOT EXISTS "settings" (
          "id" BIGSERIAL PRIMARY KEY,
          "key" VARCHAR(255) NOT NULL UNIQUE,
          "value" TEXT NOT NULL,
          "category" "SettingCategory" NOT NULL,
          "description" TEXT,
          "dataType" "SettingDataType" NOT NULL DEFAULT 'STRING',
          "isPublic" BOOLEAN NOT NULL DEFAULT false,
          "createdBy" TEXT NOT NULL,
          "updatedBy" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create indexes for settings
      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_settings_category" ON "settings"("category");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_settings_is_public" ON "settings"("isPublic");
      `);

      // Create AttendanceStatus enum
      await tenantClient.query(`
        DO $$ BEGIN
          CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'LEAVE', 'SICK', 'REMOTE', 'HALF_DAY');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // Create attendance_period table
      await tenantClient.query(`
        CREATE TABLE IF NOT EXISTS "attendance_period" (
          "id" BIGSERIAL PRIMARY KEY,
          "name" VARCHAR(255) NOT NULL,
          "startDate" TIMESTAMP NOT NULL,
          "endDate" TIMESTAMP NOT NULL,
          "workingDaysPerWeek" INTEGER DEFAULT 5,
          "workingHoursPerDay" INTEGER DEFAULT 8,
          "workingStartTime" VARCHAR(5) DEFAULT '09:00',
          "workingEndTime" VARCHAR(5) DEFAULT '17:00',
          "allowSaturdayWork" BOOLEAN DEFAULT false,
          "allowSundayWork" BOOLEAN DEFAULT false,
          "lateToleranceMinutes" INTEGER DEFAULT 15,
          "earlyLeaveToleranceMinutes" INTEGER DEFAULT 15,
          "description" TEXT,
          "isActive" BOOLEAN DEFAULT false,
          "createdBy" VARCHAR(255) NOT NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create attendances table
      await tenantClient.query(`
        CREATE TABLE IF NOT EXISTS "attendances" (
          "id" BIGSERIAL PRIMARY KEY,
          "employeeId" BIGINT NOT NULL,
          "attendancePeriodId" BIGINT NOT NULL,
          "date" DATE NOT NULL,
          "checkIn" TIMESTAMP(3),
          "checkOut" TIMESTAMP(3),
          "checkInLocation" TEXT,
          "checkOutLocation" TEXT,
          "workDuration" INTEGER,
          "status" VARCHAR(50) NOT NULL,
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "attendances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE,
          CONSTRAINT "attendances_attendancePeriodId_fkey" FOREIGN KEY ("attendancePeriodId") REFERENCES "attendance_period"("id") ON DELETE CASCADE
        );
      `);

      // Create attendance_log table
      await tenantClient.query(`
        CREATE TABLE IF NOT EXISTS "attendance_log" (
          "id" BIGSERIAL PRIMARY KEY,
          "attendanceId" BIGINT NOT NULL,
          "employeeId" BIGINT NOT NULL,
          "action" VARCHAR(50) NOT NULL,
          "oldValues" TEXT,
          "newValues" TEXT,
          "modifiedBy" BIGINT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "attendance_log_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "attendances"("id") ON DELETE CASCADE,
          CONSTRAINT "attendance_log_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE
        );
      `);

      // Create holiday table
      await tenantClient.query(`
        CREATE TABLE IF NOT EXISTS "holiday" (
          "id" BIGSERIAL PRIMARY KEY,
          "attendancePeriodId" BIGINT NOT NULL,
          "name" VARCHAR(255) NOT NULL,
          "date" DATE NOT NULL,
          "isRecurring" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "holiday_attendancePeriodId_fkey" FOREIGN KEY ("attendancePeriodId") REFERENCES "attendance_period"("id") ON DELETE CASCADE
        );
      `);

      // Create indexes for attendance_period
      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_attendance_period_is_active" ON "attendance_period"("isActive");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_attendance_period_dates" ON "attendance_period"("startDate", "endDate");
      `);

      // Create indexes for attendances
      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_attendances_employee_id" ON "attendances"("employeeId");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_attendances_period_id" ON "attendances"("attendancePeriodId");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_attendances_date" ON "attendances"("date");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_attendances_status" ON "attendances"("status");
      `);

      await tenantClient.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "idx_attendances_employee_period_date" ON "attendances"("employeeId", "attendancePeriodId", "date");
      `);

      // Create indexes for attendance_log
      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_attendance_log_attendance_id" ON "attendance_log"("attendanceId");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_attendance_log_employee_id" ON "attendance_log"("employeeId");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_attendance_log_action" ON "attendance_log"("action");
      `);

      // Create indexes for holiday
      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_holiday_period_id" ON "holiday"("attendancePeriodId");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_holiday_date" ON "holiday"("date");
      `);

      // Create LeaveType enum
      await tenantClient.query(`
        DO $$ BEGIN
          CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'HAJJ_UMRAH', 'EMERGENCY', 'COMPASSIONATE', 'STUDY', 'UNPAID');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // Create LeaveRequestStatus enum
      await tenantClient.query(`
        DO $$ BEGIN
          CREATE TYPE "LeaveRequestStatus" AS ENUM ('PENDING', 'MANAGER_APPROVED', 'APPROVED', 'REJECTED', 'CANCELLED');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // Create leave_period table
      await tenantClient.query(`
        CREATE TABLE IF NOT EXISTS "leave_period" (
          "id" BIGSERIAL PRIMARY KEY,
          "name" VARCHAR(255) NOT NULL,
          "startDate" DATE NOT NULL,
          "endDate" DATE NOT NULL,
          "isActive" BOOLEAN DEFAULT false,
          "description" TEXT,
          "createdBy" BIGINT NOT NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create leave_type_config table
      await tenantClient.query(`
        CREATE TABLE IF NOT EXISTS "leave_type_config" (
          "id" BIGSERIAL PRIMARY KEY,
          "leavePeriodId" BIGINT NOT NULL,
          "type" "LeaveType" NOT NULL,
          "name" VARCHAR(255) NOT NULL,
          "defaultQuota" INTEGER NOT NULL,
          "maxConsecutiveDays" INTEGER,
          "advanceNoticeDays" INTEGER,
          "isCarryForward" BOOLEAN DEFAULT false,
          "maxCarryForward" INTEGER,
          "requiresApproval" BOOLEAN DEFAULT true,
          "allowNegativeBalance" BOOLEAN DEFAULT false,
          "description" TEXT,
          "isActive" BOOLEAN DEFAULT true,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "leave_type_config_leavePeriodId_fkey" FOREIGN KEY ("leavePeriodId") REFERENCES "leave_period"("id") ON DELETE CASCADE,
          CONSTRAINT "unique_leave_type_per_period" UNIQUE ("leavePeriodId", "type")
        );
      `);

      // Create leave_balance table
      await tenantClient.query(`
        CREATE TABLE IF NOT EXISTS "leave_balance" (
          "id" BIGSERIAL PRIMARY KEY,
          "employeeId" BIGINT NOT NULL,
          "leavePeriodId" BIGINT NOT NULL,
          "leaveTypeConfigId" BIGINT NOT NULL,
          "totalQuota" INTEGER NOT NULL DEFAULT 0,
          "usedQuota" DECIMAL(5,2) DEFAULT 0,
          "pendingQuota" DECIMAL(5,2) DEFAULT 0,
          "adjustmentQuota" INTEGER DEFAULT 0,
          "carriedForwardQuota" INTEGER DEFAULT 0,
          "remainingQuota" DECIMAL(5,2) DEFAULT 0,
          "lastUpdated" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "leave_balance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE,
          CONSTRAINT "leave_balance_leavePeriodId_fkey" FOREIGN KEY ("leavePeriodId") REFERENCES "leave_period"("id") ON DELETE CASCADE,
          CONSTRAINT "leave_balance_leaveTypeConfigId_fkey" FOREIGN KEY ("leaveTypeConfigId") REFERENCES "leave_type_config"("id") ON DELETE CASCADE,
          CONSTRAINT "unique_employee_period_type" UNIQUE ("employeeId", "leavePeriodId", "leaveTypeConfigId")
        );
      `);

      // Create leave_request table
      await tenantClient.query(`
        CREATE TABLE IF NOT EXISTS "leave_request" (
          "id" BIGSERIAL PRIMARY KEY,
          "employeeId" BIGINT NOT NULL,
          "leaveTypeConfigId" BIGINT NOT NULL,
          "leavePeriodId" BIGINT NOT NULL,
          "startDate" DATE NOT NULL,
          "endDate" DATE NOT NULL,
          "totalDays" DECIMAL(5,2) NOT NULL,
          "reason" TEXT NOT NULL,
          "status" "LeaveRequestStatus" DEFAULT 'PENDING',
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
          CONSTRAINT "leave_request_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE,
          CONSTRAINT "leave_request_leaveTypeConfigId_fkey" FOREIGN KEY ("leaveTypeConfigId") REFERENCES "leave_type_config"("id") ON DELETE RESTRICT,
          CONSTRAINT "leave_request_leavePeriodId_fkey" FOREIGN KEY ("leavePeriodId") REFERENCES "leave_period"("id") ON DELETE RESTRICT
        );
      `);

      // Create indexes for leave tables
      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_leave_period_active" ON "leave_period"("isActive");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_leave_period_dates" ON "leave_period"("startDate", "endDate");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_leave_type_config_period" ON "leave_type_config"("leavePeriodId");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_leave_type_config_type" ON "leave_type_config"("type");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_leave_type_config_active" ON "leave_type_config"("isActive");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_leave_balance_employee" ON "leave_balance"("employeeId");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_leave_balance_period" ON "leave_balance"("leavePeriodId");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_leave_balance_type_config" ON "leave_balance"("leaveTypeConfigId");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_leave_request_employee" ON "leave_request"("employeeId");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_leave_request_status" ON "leave_request"("status");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_leave_request_dates" ON "leave_request"("startDate", "endDate");
      `);

      // Create OvertimeStatus enum
      await tenantClient.query(`
        DO $$ BEGIN
          CREATE TYPE "OvertimeStatus" AS ENUM ('PENDING', 'MANAGER_APPROVED', 'HR_APPROVED', 'APPROVED', 'REJECTED', 'CANCELLED');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // Create ApprovalStatus enum
      await tenantClient.query(`
        DO $$ BEGIN
          CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // Create overtime_request table
      await tenantClient.query(`
        CREATE TABLE IF NOT EXISTS "overtime_request" (
          "id" BIGSERIAL PRIMARY KEY,
          "employeeId" BIGINT NOT NULL,
          "attendanceId" BIGINT,
          "date" DATE NOT NULL,
          "startTime" TIMESTAMP NOT NULL,
          "endTime" TIMESTAMP NOT NULL,
          "totalMinutes" INTEGER NOT NULL,
          "reason" TEXT NOT NULL,
          "status" "OvertimeStatus" DEFAULT 'PENDING',
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
          CONSTRAINT "overtime_request_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE,
          CONSTRAINT "overtime_request_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "attendances"("id") ON DELETE SET NULL
        );
      `);

      // Create overtime_approval table
      await tenantClient.query(`
        CREATE TABLE IF NOT EXISTS "overtime_approval" (
          "id" BIGSERIAL PRIMARY KEY,
          "overtimeRequestId" BIGINT NOT NULL,
          "approverId" BIGINT NOT NULL,
          "approverType" VARCHAR(20) NOT NULL,
          "status" "ApprovalStatus" DEFAULT 'PENDING',
          "comments" TEXT,
          "approvedAt" TIMESTAMP,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "overtime_approval_overtimeRequestId_fkey" FOREIGN KEY ("overtimeRequestId") REFERENCES "overtime_request"("id") ON DELETE CASCADE,
          CONSTRAINT "overtime_approval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "employees"("id") ON DELETE CASCADE,
          UNIQUE ("overtimeRequestId", "approverId", "approverType")
        );
      `);

      // Create indexes for overtime tables
      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_overtime_request_employee" ON "overtime_request"("employeeId");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_overtime_request_status" ON "overtime_request"("status");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_overtime_request_date" ON "overtime_request"("date");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_overtime_request_attendance" ON "overtime_request"("attendanceId");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_overtime_request_submitted" ON "overtime_request"("submittedAt");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_overtime_approval_request" ON "overtime_approval"("overtimeRequestId");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_overtime_approval_approver" ON "overtime_approval"("approverId");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_overtime_approval_status" ON "overtime_approval"("status");
      `);

      // Create payrolls table
      await tenantClient.query(`
        CREATE TABLE IF NOT EXISTS "payrolls" (
          "id" BIGSERIAL PRIMARY KEY,
          "employeeId" BIGINT NOT NULL,
          "periodStart" DATE NOT NULL,
          "periodEnd" DATE NOT NULL,
          "baseSalary" DECIMAL(15,2) NOT NULL,
          "overtimePay" DECIMAL(15,2) DEFAULT 0,
          "deductions" DECIMAL(15,2) DEFAULT 0,
          "bonuses" DECIMAL(15,2) DEFAULT 0,
          "grossSalary" DECIMAL(15,2) NOT NULL,
          "netSalary" DECIMAL(15,2) NOT NULL,
          "overtimeHours" DECIMAL(10,2) DEFAULT 0,
          "regularHours" DECIMAL(10,2) DEFAULT 0,
          "isPaid" BOOLEAN DEFAULT false,
          "processedAt" TIMESTAMP,
          "processedBy" BIGINT,
          "notes" TEXT,
          "paidAt" TIMESTAMP,
          "processorId" BIGINT,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "payrolls_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE,
          CONSTRAINT "payrolls_processorId_fkey" FOREIGN KEY ("processorId") REFERENCES "users"("id") ON DELETE SET NULL
        );
      `);

      // Create indexes for payrolls
      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_payrolls_employee" ON "payrolls"("employeeId");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_payrolls_period" ON "payrolls"("periodStart", "periodEnd");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_payrolls_paid" ON "payrolls"("isPaid");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_payrolls_employee_period" ON "payrolls"("employeeId", "periodStart" DESC);
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_payrolls_processed" ON "payrolls"("processedAt");
      `);

      // Create payslips table
      await tenantClient.query(`
        CREATE TABLE IF NOT EXISTS "payslips" (
          "id" BIGSERIAL PRIMARY KEY,
          "payrollId" BIGINT NOT NULL UNIQUE,
          "grossSalary" DECIMAL(15,2) NOT NULL,
          "overtimePay" DECIMAL(15,2) DEFAULT 0,
          "bonuses" DECIMAL(15,2) DEFAULT 0,
          "allowances" DECIMAL(15,2) DEFAULT 0,
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
          CONSTRAINT "payslips_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "payrolls"("id") ON DELETE CASCADE,
          CONSTRAINT "payslips_generatedBy_fkey" FOREIGN KEY ("generatedBy") REFERENCES "users"("id") ON DELETE RESTRICT
        );
      `);

      // Create payroll_deductions table
      await tenantClient.query(`
        CREATE TABLE IF NOT EXISTS "payroll_deductions" (
          "id" BIGSERIAL PRIMARY KEY,
          "payslipId" BIGINT NOT NULL,
          "type" VARCHAR(50) NOT NULL,
          "description" TEXT NOT NULL,
          "amount" DECIMAL(15,2) NOT NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "payroll_deductions_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "payslips"("id") ON DELETE CASCADE
        );
      `);

      // Create indexes for payslips
      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_payslips_payroll" ON "payslips"("payrollId");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_payslips_generated_at" ON "payslips"("generatedAt" DESC);
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_payslips_generator" ON "payslips"("generatedBy");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_deductions_payslip" ON "payroll_deductions"("payslipId");
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_deductions_type" ON "payroll_deductions"("type");
      `);

      // Seed initial user if seedData provided
      if (seedData) {
        try {
          const insertResult = await tenantClient.query(
            `
            INSERT INTO "users" ("email", "firstName", "lastName", "password", "role", "isActive", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW());
            `,
            [
              seedData.email,
              seedData.firstName,
              seedData.lastName,
              seedData.password,
              'ADMIN',
              true,
            ],
          );
          this.logger.log(
            `Initial user seeded for database ${databaseName} with email: ${seedData.email}, rows affected: ${insertResult.rowCount}`,
          );
        } catch (seedError) {
          this.logger.error(
            `Error seeding user to database ${databaseName}:`,
            seedError,
          );
          throw seedError;
        }
      }

      this.logger.log(`Schema created successfully for database ${databaseName}`);
    } catch (error) {
      this.logger.error(`Error creating schema for database ${databaseName}:`, error);
      throw error;
    } finally {
      tenantClient.release();
      await tenantPool.end();
    }
  }

  async deleteTenantDatabase(tenantSlug: string): Promise<void> {
    const databaseName = `${tenantSlug}_erp`;
    const client = await this.pool.connect();

    try {
      // Terminate all connections to the database
      await client.query(
        `SELECT pg_terminate_backend(pg_stat_activity.pid)
         FROM pg_stat_activity
         WHERE pg_stat_activity.datname = $1
         AND pid <> pg_backend_pid()`,
        [databaseName],
      );

      // Drop database
      await client.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
      this.logger.log(`Database ${databaseName} deleted successfully`);
    } catch (error) {
      this.logger.error(`Error deleting database ${databaseName}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async databaseExists(tenantSlug: string): Promise<boolean> {
    const databaseName = `${tenantSlug}_erp`;
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [databaseName],
      );
      return result.rows.length > 0;
    } catch (error) {
      this.logger.error(`Error checking database existence:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
