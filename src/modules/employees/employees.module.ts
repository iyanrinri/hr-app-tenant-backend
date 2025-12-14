import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { EmployeePrismaService } from '../../database/employee-prisma.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [EmployeesService, EmployeePrismaService],
  controllers: [EmployeesController],
  exports: [EmployeesService, EmployeePrismaService],
})
export class EmployeesModule {}
