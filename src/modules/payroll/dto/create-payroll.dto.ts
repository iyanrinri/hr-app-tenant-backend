import { IsDateString, IsDecimal, IsOptional, IsString, IsNotEmpty, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreatePayrollDto {
  @ApiProperty({
    description: 'Employee ID',
    example: '1',
  })
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @ApiProperty({
    description: 'Payroll period start date',
    example: '2024-01-01T00:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  periodStart: string;

  @ApiProperty({
    description: 'Payroll period end date',
    example: '2024-01-31T23:59:59Z',
  })
  @IsDateString()
  @IsNotEmpty()
  periodEnd: string;

  @ApiPropertyOptional({
    description: 'Manual deductions',
    example: '100.00',
    default: '0',
  })
  @IsOptional()
  @IsDecimal({ decimal_digits: '2' })
  @Transform(({ value }) => value?.toString())
  deductions?: string;

  @ApiPropertyOptional({
    description: 'Manual bonuses',
    example: '500.00',
    default: '0',
  })
  @IsOptional()
  @IsDecimal({ decimal_digits: '2' })
  @Transform(({ value }) => value?.toString())
  bonuses?: string;

  @ApiPropertyOptional({
    description: 'Array of approved overtime request IDs to include',
    example: ['1', '2', '3'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  overtimeRequestIds?: string[];
}

export class ProcessPayrollDto {
  @ApiProperty({
    description: 'Array of payroll IDs to process',
    example: ['1', '2', '3'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  payrollIds: string[];
}