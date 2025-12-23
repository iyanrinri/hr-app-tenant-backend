import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum JKKRiskCategory {
  LOW = 'LOW',
  MEDIUM_LOW = 'MEDIUM_LOW',
  MEDIUM = 'MEDIUM',
  MEDIUM_HIGH = 'MEDIUM_HIGH',
  HIGH = 'HIGH',
}

export class GeneratePayslipDto {
  @ApiProperty({
    description: 'Payroll ID to generate payslip for',
    example: 1,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  payrollId: number;

  @ApiProperty({
    description: 'JKK (Work Accident Insurance) risk category',
    example: 'LOW',
    enum: JKKRiskCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(JKKRiskCategory)
  jkkRiskCategory?: JKKRiskCategory;

  @ApiProperty({
    description: 'Number of dependents for tax calculation (0-3)',
    example: 0,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  dependents?: number;

  @ApiProperty({
    description: 'Additional allowances not in payroll',
    example: 0,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  additionalAllowances?: number;

  @ApiProperty({
    description: 'Other deductions not calculated automatically',
    example: 0,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  otherDeductions?: number;
}
