import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { UsersModule } from './modules/users/users.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AttendancePeriodModule } from './modules/attendance-period/attendance-period.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { LeaveModule } from './modules/leave/leave.module';
import { OvertimeModule } from './modules/overtime/overtime.module';
import { KafkaModule } from './common/modules/kafka.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot(),
    KafkaModule,
    DatabaseModule,
    AuthModule,
    TenantModule,
    UsersModule,
    EmployeesModule,
    SettingsModule,
    AttendancePeriodModule,
    AttendanceModule,
    LeaveModule,
    OvertimeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
