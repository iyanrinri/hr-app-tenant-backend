import { Module } from '@nestjs/common';
import { AttendanceController } from './controllers/attendance.controller';
import { AttendanceService } from './services/attendance.service';
import { AttendanceRepository } from './repositories/attendance.repository';
import { AttendancePeriodModule } from '../attendance-period/attendance-period.module';
import { EmployeesModule } from '../employees/employees.module';
import { DatabaseModule } from '../../database/database.module';
// import { NotificationModule } from '../../common/modules/notification.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [DatabaseModule, AttendancePeriodModule, EmployeesModule, SettingsModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceRepository],
  exports: [AttendanceService, AttendanceRepository],
})
export class AttendanceModule {}