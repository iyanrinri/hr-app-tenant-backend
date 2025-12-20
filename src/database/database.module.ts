import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { DatabaseTenantService } from './database-tenant.service';
import { MultiTenantPrismaService } from './multi-tenant-prisma.service';

@Module({
  providers: [PrismaService, DatabaseTenantService, MultiTenantPrismaService],
  exports: [PrismaService, DatabaseTenantService, MultiTenantPrismaService],
})
export class DatabaseModule {}
