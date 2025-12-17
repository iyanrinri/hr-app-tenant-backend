import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class AttendancePrismaService {
  private clients: Map<string, any> = new Map();

  getClient(tenantSlug: string): any {
    if (!this.clients.has(tenantSlug)) {
      try {
        const databaseUrl = this.buildDatabaseUrl(tenantSlug);
        console.log(`[AttendancePrisma] Creating client for tenant: ${tenantSlug}`);
        const pool = new Pool({ connectionString: databaseUrl });
        const adapter = new PrismaPg(pool);
        const prismaClient = new PrismaClient({ adapter });
        this.clients.set(tenantSlug, prismaClient);
      } catch (error) {
        console.error(`[AttendancePrisma] Failed to create client for ${tenantSlug}:`, error);
        throw error;
      }
    }
    return this.clients.get(tenantSlug)!;
  }

  private buildDatabaseUrl(tenantSlug: string): string {
    const newUrl = new URL(process.env.DATABASE_URL!);
    newUrl.pathname = `/${tenantSlug.trim()}_erp`;
    return newUrl.toString();
  }

  async disconnectAll() {
    for (const [, client] of this.clients) {
      await client.$disconnect();
    }
    this.clients.clear();
  }
}
