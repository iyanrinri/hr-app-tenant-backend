import { IsString, IsOptional, IsEnum } from 'class-validator';
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
