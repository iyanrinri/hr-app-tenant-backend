import { IsString, IsOptional, IsEnum, IsDateString, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum OvertimeStatus {
  PENDING = 'PENDING',
  MANAGER_APPROVED = 'MANAGER_APPROVED',
  HR_APPROVED = 'HR_APPROVED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export class UpdateOvertimeRequestDto {
  @ApiPropertyOptional({ 
    example: 123,
    description: 'Employee ID (only for ADMIN/SUPER)'
  })
  @IsNumber()
  @IsOptional()
  employeeId?: number;

  @ApiPropertyOptional({ 
    example: '2024-12-12',
    description: 'Date of the overtime work'
  })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ 
    example: '2024-12-12T18:00:00Z',
    description: 'Start time of overtime work'
  })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ 
    example: '2024-12-12T21:00:00Z',
    description: 'End time of overtime work'
  })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({ 
    example: 'System deployment and maintenance work',
    description: 'Reason for overtime work'
  })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ 
    enum: OvertimeStatus,
    example: OvertimeStatus.APPROVED,
    description: 'Status of the overtime request'
  })
  @IsEnum(OvertimeStatus)
  @IsOptional()
  status?: OvertimeStatus;

  @ApiPropertyOptional({ 
    example: 'Approved for urgent project deadline',
    description: 'Manager comments on the overtime request'
  })
  @IsString()
  @IsOptional()
  managerComments?: string;

  @ApiPropertyOptional({ 
    example: 'Overtime compensation approved',
    description: 'HR comments on the overtime request'
  })
  @IsString()
  @IsOptional()
  hrComments?: string;

  @ApiPropertyOptional({ 
    example: 'Not enough justification for overtime',
    description: 'Reason for rejection'
  })
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
