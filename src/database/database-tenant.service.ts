import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as pg from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

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
      database: 'postgres',
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

      // Create empty database
      await client.query(`CREATE DATABASE "${databaseName}"`);
      this.logger.log(`✅ Empty database ${databaseName} created`);

      // Create migrations_log table only
      await this.createMigrationsLogTable(databaseName);

      // Run ALL migrations to create all tables
      await this.runTenantMigrations(databaseName);

      // Seed initial user AFTER migrations complete
      if (seedData) {
        await this.seedInitialUser(databaseName, seedData);
      }

      this.logger.log(`✅ Tenant database ${databaseName} setup complete`);
    } catch (error) {
      this.logger.error(`Error creating database ${databaseName}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create only migrations_log table - all other tables created by migrations
   */
  private async createMigrationsLogTable(databaseName: string): Promise<void> {
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
      await tenantClient.query(`
        CREATE TABLE IF NOT EXISTS "migrations_log" (
          "id" BIGSERIAL PRIMARY KEY,
          "migration_name" VARCHAR(255) NOT NULL UNIQUE,
          "executed_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "status" VARCHAR(50) DEFAULT 'SUCCESS'
        );
      `);

      await tenantClient.query(`
        CREATE INDEX IF NOT EXISTS "idx_migrations_log_name" ON "migrations_log"("migration_name");
      `);

      this.logger.log(`✅ migrations_log table created for ${databaseName}`);
    } catch (error) {
      this.logger.error(`Error creating migrations_log:`, error);
      throw error;
    } finally {
      tenantClient.release();
      await tenantPool.end();
    }
  }

  /**
   * Run all migration files to create tables
   */
  private async runTenantMigrations(databaseName: string): Promise<void> {
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

    try {
      this.logger.log(`🔄 Running migrations for ${databaseName}...`);

      // Get all migration directories
      const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations-tenant');
      
      if (!fs.existsSync(migrationsDir)) {
        this.logger.warn(`Migrations directory not found: ${migrationsDir}`);
        return;
      }

      const migrationFolders = fs
        .readdirSync(migrationsDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort();

      this.logger.log(`Found ${migrationFolders.length} migration(s)`);

      // Run each migration
      for (const folder of migrationFolders) {
        const migrationFile = path.join(migrationsDir, folder, 'migration.sql');
        
        if (!fs.existsSync(migrationFile)) {
          continue;
        }

        try {
          // Check if already executed
          const checkResult = await tenantPool.query(
            `SELECT 1 FROM migrations_log WHERE migration_name = $1 LIMIT 1`,
            [folder]
          );

          if (checkResult.rows.length > 0) {
            this.logger.log(`  ⏭️  ${folder} (already executed)`);
            continue;
          }

          const migrationSQL = fs.readFileSync(migrationFile, 'utf-8');
          
          this.logger.log(`  🔄 Running ${folder}...`);
          
          // Execute migration
          await tenantPool.query(migrationSQL);

          // Record migration
          await tenantPool.query(
            `INSERT INTO migrations_log (migration_name, executed_at) VALUES ($1, NOW())`,
            [folder]
          );

          this.logger.log(`  ✅ ${folder} completed`);
        } catch (error: any) {
          // Ignore "already exists" errors
          if (
            error.code === '42P07' || // relation already exists
            error.code === '42710' || // object already exists
            error.code === '42P01'    // migrations_log doesn't exist yet
          ) {
            this.logger.log(`  ⚠️  ${folder} (object already exists)`);
            try {
              await tenantPool.query(
                `INSERT INTO migrations_log (migration_name, executed_at) VALUES ($1, NOW()) ON CONFLICT (migration_name) DO NOTHING`,
                [folder]
              );
            } catch (recordError) {
              // Ignore
            }
            continue;
          }

          this.logger.error(`  ❌ ${folder} failed:`, error.message);
          throw error;
        }
      }

      this.logger.log(`✅ All migrations completed for ${databaseName}`);
    } catch (error) {
      this.logger.error(`Error running migrations:`, error);
      throw error;
    } finally {
      await tenantPool.end();
    }
  }

  /**
   * Seed initial admin user after migrations complete
   */
  private async seedInitialUser(
    databaseName: string,
    seedData: {
      email: string;
      firstName: string;
      lastName: string;
      password: string;
      role: string;
    }
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
      // Check if user already exists
      const existingUser = await tenantClient.query(
        `SELECT 1 FROM "users" WHERE "email" = $1 LIMIT 1`,
        [seedData.email]
      );

      if (existingUser.rows.length > 0) {
        this.logger.log(`User ${seedData.email} already exists, skipping seed`);
        return;
      }

      // Insert initial admin user
      const userId = randomUUID();
      await tenantClient.query(
        `
        INSERT INTO "users" ("id", "email", "firstName", "lastName", "password", "role", "isActive", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW());
        `,
        [
          userId,
          seedData.email,
          seedData.firstName,
          seedData.lastName,
          seedData.password,
          'ADMIN',
          true,
        ],
      );

      this.logger.log(`✅ Initial admin user created: ${seedData.email}`);
    } catch (seedError) {
      this.logger.error(`Error seeding user:`, seedError);
      throw seedError;
    } finally {
      tenantClient.release();
      await tenantPool.end();
    }
  }

  async deleteTenantDatabase(tenantSlug: string): Promise<void> {
    const databaseName = `${tenantSlug}_erp`;
    const client = await this.pool.connect();

    try {
      // Terminate all connections
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
