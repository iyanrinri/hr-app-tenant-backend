import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ApproverType {
  MANAGER = 'MANAGER',
  HR = 'HR',
}

export class CreateOvertimeApprovalDto {
  @ApiProperty({ 
    example: 123,
    description: 'Overtime request ID'
  })
  @IsNumber()
  @IsNotEmpty()
  overtimeRequestId: number;

  @ApiProperty({ 
    example: 456,
    description: 'Approver employee ID'
  })
  @IsNumber()
  @IsNotEmpty()
  approverId: number;

  @ApiProperty({ 
    enum: ApproverType,
    example: ApproverType.MANAGER,
    description: 'Type of approver'
  })
  @IsEnum(ApproverType)
  @IsNotEmpty()
  approverType: ApproverType;

  @ApiProperty({ 
    enum: ApprovalStatus,
    example: ApprovalStatus.APPROVED,
    description: 'Approval status'
  })
  @IsEnum(ApprovalStatus)
  @IsNotEmpty()
  status: ApprovalStatus;

  @ApiPropertyOptional({ 
    example: 'Approved due to project urgency',
    description: 'Comments from approver'
  })
  @IsString()
  @IsOptional()
  comments?: string;
}

export class UpdateOvertimeApprovalDto {
  @ApiPropertyOptional({ 
    enum: ApprovalStatus,
    example: ApprovalStatus.APPROVED,
    description: 'Approval status'
  })
  @IsEnum(ApprovalStatus)
  @IsOptional()
  status?: ApprovalStatus;

  @ApiPropertyOptional({ 
    example: 'Approved with conditions',
    description: 'Comments from approver'
  })
  @IsString()
  @IsOptional()
  comments?: string;
}
