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
