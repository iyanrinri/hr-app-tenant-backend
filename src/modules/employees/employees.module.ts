import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { MultiTenantPrismaService } from '@/database/multi-tenant-prisma.service';
import { AuthModule } from '../../auth/auth.module';
import { multerConfig } from '../../common/config/multer.config';

@Module({
  imports: [AuthModule, MulterModule.register(multerConfig)],
  providers: [EmployeesService, MultiTenantPrismaService],
  controllers: [EmployeesController],
  exports: [EmployeesService, MultiTenantPrismaService],
})
export class EmployeesModule {}
