import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { EmployeePrismaService } from '../../database/employee-prisma.service';
import { AuthModule } from '../../auth/auth.module';
import { multerConfig } from '../../common/config/multer.config';

@Module({
  imports: [AuthModule, MulterModule.register(multerConfig)],
  providers: [EmployeesService, EmployeePrismaService],
  controllers: [EmployeesController],
  exports: [EmployeesService, EmployeePrismaService],
})
export class EmployeesModule {}
