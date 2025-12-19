import { Module } from '@nestjs/common';
import { OvertimeRequestService } from './services/overtime-request.service';
import { OvertimeApprovalService } from './services/overtime-approval.service';
import { OvertimeRequestController } from './controllers/overtime-request.controller';
import { OvertimeApprovalController } from './controllers/overtime-approval.controller';
import { OvertimeRequestRepository } from './repositories/overtime-request.repository';
import { OvertimeApprovalRepository } from './repositories/overtime-approval.repository';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [OvertimeRequestController, OvertimeApprovalController],
  providers: [
    OvertimeRequestService,
    OvertimeApprovalService,
    OvertimeRequestRepository,
    OvertimeApprovalRepository,
  ],
  exports: [
    OvertimeRequestService,
    OvertimeApprovalService,
    OvertimeRequestRepository,
    OvertimeApprovalRepository,
  ],
})
export class OvertimeModule {}