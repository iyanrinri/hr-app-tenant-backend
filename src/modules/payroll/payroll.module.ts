import { Module } from '@nestjs/common';
import { PayrollController } from './controllers/payroll.controller';
import { PayrollService } from './services/payroll.service';
import { PayrollRepository } from './repositories/payroll.repository';
import { DatabaseModule } from '../../database/database.module';
import { SalaryModule } from '../salary/salary.module';
import { OvertimeModule } from '../overtime/overtime.module';
import { SettingsModule } from '../settings/settings.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { EmployeesModule } from '../employees/employees.module';

@Module({
  imports: [
    DatabaseModule,
    SalaryModule,
    OvertimeModule,
    SettingsModule,
    AttendanceModule,
    EmployeesModule,
  ],
  controllers: [PayrollController],
  providers: [PayrollService, PayrollRepository],
  exports: [PayrollService, PayrollRepository],
})
export class PayrollModule {}