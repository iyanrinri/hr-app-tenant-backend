import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { DatabaseTenantService } from './database-tenant.service';
import { EmployeePrismaService } from './employee-prisma.service';
import { SettingsPrismaService } from './settings-prisma.service';
import { AttendancePeriodPrismaService } from './attendance-period-prisma.service';
import { AttendancePrismaService } from './attendance-prisma.service';
import { MultiTenantPrismaService } from './multi-tenant-prisma.service';

@Module({
  providers: [PrismaService, DatabaseTenantService, EmployeePrismaService, SettingsPrismaService, AttendancePeriodPrismaService, AttendancePrismaService, MultiTenantPrismaService],
  exports: [PrismaService, DatabaseTenantService, EmployeePrismaService, SettingsPrismaService, AttendancePeriodPrismaService, AttendancePrismaService, MultiTenantPrismaService],
})
export class DatabaseModule {}
