import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { DatabaseTenantService } from './database-tenant.service';
import { EmployeePrismaService } from './employee-prisma.service';
import { SettingsPrismaService } from './settings-prisma.service';

@Module({
  providers: [PrismaService, DatabaseTenantService, EmployeePrismaService, SettingsPrismaService],
  exports: [PrismaService, DatabaseTenantService, EmployeePrismaService, SettingsPrismaService],
})
export class DatabaseModule {}
