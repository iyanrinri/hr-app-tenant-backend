import { IsString, IsNotEmpty, IsNumber, IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

// Define LeaveType enum locally until Prisma generates it
export enum LeaveType {
  ANNUAL = 'ANNUAL',
  SICK = 'SICK',
  MATERNITY = 'MATERNITY',
  PATERNITY = 'PATERNITY',
  HAJJ_UMRAH = 'HAJJ_UMRAH',
  EMERGENCY = 'EMERGENCY',
  COMPASSIONATE = 'COMPASSIONATE',
  STUDY = 'STUDY',
  UNPAID = 'UNPAID'
}

export class CreateLeaveTypeConfigDto {
  @ApiProperty({ 
    example: 1,
    description: 'Leave period ID this configuration belongs to'
  })
  @IsNumber()
  leavePeriodId: number;

  @ApiProperty({ 
    example: 'ANNUAL',
    description: 'Type of leave',
    enum: LeaveType
  })
  @IsEnum(LeaveType)
  @IsNotEmpty()
  type: LeaveType;

  @ApiProperty({ 
    example: 'Annual Leave',
    description: 'Display name for the leave type'
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ 
    example: 'Yearly vacation entitlement',
    description: 'Description of the leave type'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    example: 30,
    description: 'Default quota in days for this leave type'
  })
  @IsNumber()
  defaultQuota: number;

  @ApiPropertyOptional({ 
    example: 15,
    description: 'Maximum consecutive days that can be taken'
  })
  @IsOptional()
  @IsNumber()
  maxConsecutiveDays?: number;

  @ApiProperty({ 
    example: 3,
    description: 'Required advance notice in days'
  })
  @IsNumber()
  advanceNoticeDays: number;

  @ApiPropertyOptional({ 
    example: true,
    description: 'Whether unused quota can be carried forward to next period'
  })
  @IsOptional()
  @IsBoolean()
  isCarryForward?: boolean;

  @ApiPropertyOptional({ 
    example: 5,
    description: 'Maximum days that can be carried forward'
  })
  @IsOptional()
  @IsNumber()
  maxCarryForward?: number;

  @ApiPropertyOptional({ 
    example: true,
    description: 'Whether this leave type configuration is active'
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateLeaveTypeConfigDto {
  @ApiPropertyOptional({ 
    example: 'Annual Leave Updated',
    description: 'Display name for the leave type'
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ 
    example: 'Updated description',
    description: 'Description of the leave type'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ 
    example: 25,
    description: 'Default quota in days for this leave type'
  })
  @IsOptional()
  @IsNumber()
  defaultQuota?: number;

  @ApiPropertyOptional({ 
    example: 10,
    description: 'Maximum consecutive days that can be taken'
  })
  @IsOptional()
  @IsNumber()
  maxConsecutiveDays?: number;

  @ApiPropertyOptional({ 
    example: 5,
    description: 'Required advance notice in days'
  })
  @IsOptional()
  @IsNumber()
  advanceNoticeDays?: number;

  @ApiPropertyOptional({ 
    example: false,
    description: 'Whether unused quota can be carried forward to next period'
  })
  @IsOptional()
  @IsBoolean()
  isCarryForward?: boolean;

  @ApiPropertyOptional({ 
    example: 3,
    description: 'Maximum days that can be carried forward'
  })
  @IsOptional()
  @IsNumber()
  maxCarryForward?: number;

  @ApiPropertyOptional({ 
    example: false,
    description: 'Whether this leave type is active'
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class LeaveTypeConfigResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'ANNUAL', enum: LeaveType })
  type: LeaveType;

  @ApiProperty({ example: 'Annual Leave' })
  name: string;

  @ApiProperty({ example: 'Yearly vacation entitlement' })
  description?: string;

  @ApiProperty({ example: 30 })
  defaultQuota: number;

  @ApiProperty({ example: 15 })
  maxConsecutiveDays?: number;

  @ApiProperty({ example: 3 })
  advanceNoticeDays: number;

  @ApiProperty({ example: true })
  isCarryForward?: boolean;

  @ApiProperty({ example: 5 })
  maxCarryForward?: number;

  @ApiProperty({ example: true })
  isActive?: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  updatedAt: Date;
}