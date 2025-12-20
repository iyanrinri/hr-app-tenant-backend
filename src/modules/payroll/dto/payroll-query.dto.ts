import { IsOptional, IsDateString, IsString, IsEnum, IsNumberString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum PayrollStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  PAID = 'PAID',
}

export class PayrollQueryDto {
  @ApiPropertyOptional({
    description: 'Employee ID to filter by',
    example: '1',
  })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({
    description: 'Department to filter by',
    example: 'Engineering',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value === '' ? undefined : value)
  department?: string;

  @ApiPropertyOptional({
    description: 'Period start date filter (from)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  periodStartFrom?: string;

  @ApiPropertyOptional({
    description: 'Period start date filter (to)',
    example: '2024-01-31',
  })
  @IsOptional()
  @IsDateString()
  periodStartTo?: string;

  @ApiPropertyOptional({
    description: 'Period end date filter (from)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  periodEndFrom?: string;

  @ApiPropertyOptional({
    description: 'Period end date filter (to)',
    example: '2024-01-31',
  })
  @IsOptional()
  @IsDateString()
  periodEndTo?: string;

  @ApiPropertyOptional({
    description: 'Payroll status filter',
    example: PayrollStatus.PENDING,
    enum: PayrollStatus,
  })
  @IsOptional()
  @IsEnum(PayrollStatus)
  @Transform(({ value }) => value === '' ? undefined : value)
  status?: PayrollStatus;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }) => {
    const parsed = parseInt(value);
    return isNaN(parsed) ? 1 : parsed;
  })
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Transform(({ value }) => {
    const parsed = parseInt(value);
    return isNaN(parsed) ? 10 : parsed;
  })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'periodStart',
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}