import { Module } from '@nestjs/common';
import { AttendanceController } from './controllers/attendance.controller';
import { AttendanceService } from './services/attendance.service';
import { AttendanceRepository } from './repositories/attendance.repository';
import { AttendancePeriodModule } from '../attendance-period/attendance-period.module';
import { EmployeesModule } from '../employees/employees.module';
import { DatabaseModule } from '../../database/database.module';
import { SettingsModule } from '../settings/settings.module';
import { AttendanceGateway } from '../../common/gateways/attendance.gateway';
import { AttendanceEventConsumer } from './consumers/attendance-event.consumer';

@Module({
  imports: [DatabaseModule, AttendancePeriodModule, EmployeesModule, SettingsModule],
  controllers: [AttendanceController, AttendanceEventConsumer],
  providers: [AttendanceService, AttendanceRepository, AttendanceGateway],
  exports: [AttendanceService, AttendanceRepository],
})
export class AttendanceModule {}