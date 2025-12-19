import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OvertimeStatus } from './update-overtime-request.dto';
import { ApprovalStatus, ApproverType } from './overtime-approval.dto';

export class OvertimeRequestResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: '123' })
  employeeId: string;

  @ApiProperty({ example: '456' })
  attendanceId?: string;

  @ApiProperty({ example: '2024-12-12' })
  date: Date;

  @ApiProperty({ example: '2024-12-12T18:00:00Z' })
  startTime: Date;

  @ApiProperty({ example: '2024-12-12T21:00:00Z' })
  endTime: Date;

  @ApiProperty({ example: 180 })
  totalMinutes: number;

  @ApiProperty({ example: 'System deployment and maintenance work' })
  reason: string;

  @ApiProperty({ enum: OvertimeStatus, example: OvertimeStatus.PENDING })
  status: OvertimeStatus;

  @ApiPropertyOptional({ example: '1.5' })
  overtimeRate?: string;

  @ApiPropertyOptional({ example: '450000' })
  calculatedAmount?: string;

  @ApiPropertyOptional({ example: 'Approved for urgent project deadline' })
  managerComments?: string;

  @ApiPropertyOptional({ example: 'Overtime compensation approved' })
  hrComments?: string;

  @ApiPropertyOptional({ example: 'Not enough justification for overtime' })
  rejectionReason?: string;

  @ApiProperty({ example: '2024-12-12T15:30:00Z' })
  submittedAt: Date;

  @ApiPropertyOptional({ example: '2024-12-12T16:00:00Z' })
  managerApprovedAt?: Date;

  @ApiPropertyOptional({ example: '2024-12-12T17:00:00Z' })
  hrApprovedAt?: Date;

  @ApiPropertyOptional({ example: '2024-12-12T17:00:00Z' })
  finalizedAt?: Date;

  @ApiProperty({ example: '2024-12-12T15:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-12-12T17:00:00Z' })
  updatedAt: Date;

  @ApiPropertyOptional()
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    position: string;
    department: string;
  };

  @ApiPropertyOptional()
  attendance?: {
    id: string;
    date: Date;
    checkIn?: Date;
    checkOut?: Date;
    workDuration?: number;
  };

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  approvals?: OvertimeApprovalResponseDto[];
}

export class OvertimeApprovalResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: '123' })
  overtimeRequestId: string;

  @ApiProperty({ example: '456' })
  approverId: string;

  @ApiProperty({ enum: ApproverType, example: ApproverType.MANAGER })
  approverType: ApproverType;

  @ApiProperty({ enum: ApprovalStatus, example: ApprovalStatus.PENDING })
  status: ApprovalStatus;

  @ApiPropertyOptional({ example: 'Approved due to project urgency' })
  comments?: string;

  @ApiPropertyOptional({ example: '2024-12-12T16:00:00Z' })
  approvedAt?: Date;

  @ApiProperty({ example: '2024-12-12T15:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-12-12T16:00:00Z' })
  updatedAt: Date;

  @ApiPropertyOptional()
  approver?: {
    id: string;
    firstName: string;
    lastName: string;
    position: string;
    department: string;
  };
}

export class PaginatedOvertimeResponseDto {
  @ApiProperty({ type: [OvertimeRequestResponseDto] })
  requests: OvertimeRequestResponseDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 0 })
  skip: number;

  @ApiProperty({ example: 10 })
  take: number;
}
