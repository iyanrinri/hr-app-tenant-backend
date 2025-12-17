import { IsOptional, IsDateString, IsNumber, Min, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class AttendanceHistoryDto {
  @ApiProperty({ 
    example: 1,
    description: 'Page number for pagination',
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiProperty({ 
    example: 10,
    description: 'Number of items per page',
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiProperty({ 
    example: '2024-01-01',
    description: 'Start date for filtering attendance (YYYY-MM-DD)',
    required: false
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ 
    example: '2024-01-31',
    description: 'End date for filtering attendance (YYYY-MM-DD)',
    required: false
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ 
    example: '1',
    description: 'Filter by specific employee ID (for HR/SUPER)',
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => value ? BigInt(value) : undefined)
  employeeId?: bigint;

  @ApiProperty({ 
    example: 'PRESENT',
    description: 'Filter by attendance status',
    enum: ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'],
    required: false
  })
  @IsOptional()
  @IsString()
  status?: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
}