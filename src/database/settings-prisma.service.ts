import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class SettingsPrismaService {
  private clients: Map<string, any> = new Map();

  getClient(tenantSlug: string): any {
    if (!this.clients.has(tenantSlug)) {
      const databaseUrl = this.buildDatabaseUrl(tenantSlug);
      const pool = new Pool({ connectionString: databaseUrl });
      const adapter = new PrismaPg(pool);
      // Use the PrismaClient which should have the Setting model
      const prismaClient = new PrismaClient({ adapter });
      this.clients.set(tenantSlug, prismaClient);
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
