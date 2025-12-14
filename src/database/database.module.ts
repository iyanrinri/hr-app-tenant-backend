import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { DatabaseTenantService } from './database-tenant.service';
import { EmployeePrismaService } from './employee-prisma.service';

@Module({
  providers: [PrismaService, DatabaseTenantService, EmployeePrismaService],
  exports: [PrismaService, DatabaseTenantService, EmployeePrismaService],
})
export class DatabaseModule {}
