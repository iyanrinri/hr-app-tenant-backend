import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { EmployeesModule } from '../employees/employees.module';
import { MultiTenantPrismaService } from '@/database/multi-tenant-prisma.service';
import { MailService } from '@/common/services/mail.service';

// Controllers
import { LeavePeriodController } from './controllers/leave-period.controller';
import { LeaveTypeController } from './controllers/leave-type.controller';
import { LeaveBalanceController } from './controllers/leave-balance.controller';
import { LeaveRequestController } from './controllers/leave-request.controller';

// Services
import { LeavePeriodService } from './services/leave-period.service';
import { LeaveTypeService } from './services/leave-type.service';
import { LeaveBalanceService } from './services/leave-balance.service';
import { LeaveRequestService } from './services/leave-request.service';
import { LeaveEmailService } from './services/leave-email.service';

// Repositories
import { LeavePeriodRepository } from './repositories/leave-period.repository';
import { LeaveTypeRepository } from './repositories/leave-type.repository';
import { LeaveBalanceRepository } from './repositories/leave-balance.repository';
import { LeaveRequestRepository } from './repositories/leave-request.repository';

@Module({
  imports: [DatabaseModule, EmployeesModule],
  controllers: [
    LeavePeriodController,
    LeaveTypeController,
    LeaveBalanceController,
    LeaveRequestController,
  ],
  providers: [
    MultiTenantPrismaService,
    MailService,
    LeavePeriodService,
    LeaveTypeService,
    LeaveBalanceService,
    LeaveRequestService,
    LeaveEmailService,
    LeavePeriodRepository,
    LeaveTypeRepository,
    LeaveBalanceRepository,
    LeaveRequestRepository,
  ],
  exports: [
    MultiTenantPrismaService,
    LeavePeriodService,
    LeaveTypeService,
    LeaveBalanceService,
    LeaveRequestService,
  ],
})
export class LeaveModule {}