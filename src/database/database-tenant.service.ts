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
          "startDate" DATE NOT NULL,
          "endDate" DATE NOT NULL,
          "workDays" INTEGER NOT NULL DEFAULT 0,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
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
