import { IsString, IsNotEmpty, IsDateString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Define LeaveRequestStatus enum locally until Prisma generates it
export enum LeaveRequestStatus {
  PENDING = 'PENDING',
  MANAGER_APPROVED = 'MANAGER_APPROVED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export class CreateLeaveRequestDto {
  @ApiProperty({ 
    example: '1',
    description: 'Leave type configuration ID'
  })
  @IsString()
  @IsNotEmpty()
  leaveTypeConfigId: string;

  @ApiProperty({ 
    example: '2024-12-20',
    description: 'Start date of the leave'
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ 
    example: '2024-12-25',
    description: 'End date of the leave'
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({ 
    example: 'Family vacation',
    description: 'Reason for the leave request'
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ 
    example: '+1234567890',
    description: 'Emergency contact number'
  })
  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @ApiPropertyOptional({ 
    example: 'John will handle my responsibilities',
    description: 'Work handover notes'
  })
  @IsOptional()
  @IsString()
  handoverNotes?: string;
}

export class ApproveLeaveRequestDto {
  @ApiPropertyOptional({ 
    example: 'Approved for family vacation',
    description: 'Comments from the approver'
  })
  @IsOptional()
  @IsString()
  comments?: string;
}

export class RejectLeaveRequestDto {
  @ApiProperty({ 
    example: 'Insufficient notice period',
    description: 'Reason for rejection'
  })
  @IsString()
  @IsNotEmpty()
  rejectionReason: string;

  @ApiPropertyOptional({ 
    example: 'Please resubmit with proper notice',
    description: 'Additional comments'
  })
  @IsOptional()
  @IsString()
  comments?: string;
}

export class LeaveRequestResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: '123' })
  employeeId: string;

  @ApiProperty({ example: 'John Doe' })
  employeeName: string;

  @ApiProperty({ example: 'Annual Leave' })
  leaveTypeName: string;

  @ApiProperty({ example: '2024-12-20' })
  startDate: string;

  @ApiProperty({ example: '2024-12-25' })
  endDate: string;

  @ApiProperty({ example: 5 })
  totalDays: number;

  @ApiProperty({ example: 'Family vacation' })
  reason: string;

  @ApiProperty({ example: 'PENDING' })
  status: string;

  @ApiProperty({ example: '2024-12-15T10:00:00Z' })
  submittedAt: string;

  @ApiPropertyOptional({ example: 'Approved by manager' })
  managerComments?: string;

  @ApiPropertyOptional({ example: 'Approved by HR' })
  hrComments?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  emergencyContact?: string;

  @ApiPropertyOptional({ example: 'John will handle responsibilities' })
  handoverNotes?: string;

  @ApiPropertyOptional({ example: true })
  requiresManagerApproval?: boolean;

  @ApiPropertyOptional({ example: 'PENDING' })
  managerApprovalStatus?: string;

  @ApiPropertyOptional({ example: '2024-12-16T09:00:00Z' })
  managerApprovedAt?: string;

  @ApiPropertyOptional({ example: 'PENDING' })
  hrApprovalStatus?: string;

  @ApiPropertyOptional({ example: '2024-12-17T10:00:00Z' })
  hrApprovedAt?: string;
}

export class LeaveBalanceResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'Annual Leave' })
  leaveTypeName: string;

  @ApiProperty({ example: 20 })
  totalQuota: number;

  @ApiProperty({ example: 5 })
  usedQuota: number;

  @ApiProperty({ example: 15 })
  remainingQuota: number;

  @ApiProperty({ example: '2024-01-01' })
  validFrom: string;

  @ApiProperty({ example: '2024-12-31' })
  validTo: string;

  @ApiProperty({ example: true })
  isActive: boolean;
}

export class LeaveBalanceSummaryDto {
  @ApiProperty({ example: '123' })
  employeeId: string;

  @ApiProperty({ example: 'John Doe' })
  employeeName: string;

  @ApiProperty({ 
    type: [LeaveBalanceResponseDto],
    description: 'List of leave balances for all leave types'
  })
  balances: LeaveBalanceResponseDto[];

  @ApiProperty({ example: 50 })
  totalQuota: number;

  @ApiProperty({ example: 15 })
  totalUsed: number;

  @ApiProperty({ example: 35 })
  totalRemaining: number;
}

export class LeaveRequestHistoryDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'Annual Leave' })
  leaveTypeName: string;

  @ApiProperty({ example: '2024-12-20' })
  startDate: string;

  @ApiProperty({ example: '2024-12-25' })
  endDate: string;

  @ApiProperty({ example: 5 })
  totalDays: number;

  @ApiProperty({ example: 'Family vacation' })
  reason: string;

  @ApiProperty({ 
    example: 'APPROVED',
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']
  })
  status: string;

  @ApiProperty({ example: '2024-12-15T10:00:00Z' })
  submittedAt: string;

  @ApiPropertyOptional({ example: '2024-12-16T09:00:00Z' })
  approvedAt?: string;

  @ApiPropertyOptional({ example: 'Jane Smith' })
  approvedBy?: string;

  @ApiPropertyOptional({ example: 'Approved for family time' })
  approverComments?: string;

  @ApiPropertyOptional({ example: true })
  requiresManagerApproval?: boolean;

  @ApiPropertyOptional({ example: 'PENDING' })
  managerApprovalStatus?: string;

  @ApiPropertyOptional({ example: '2024-12-16T09:00:00Z' })
  managerApprovedAt?: string;

  @ApiPropertyOptional({ example: 'PENDING' })
  hrApprovalStatus?: string;

  @ApiPropertyOptional({ example: '2024-12-17T10:00:00Z' })
  hrApprovedAt?: string;
}