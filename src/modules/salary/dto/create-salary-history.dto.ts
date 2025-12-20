import { IsString, IsNotEmpty, IsNumber, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SalaryChangeType {
  INITIAL = 'INITIAL',
  PROMOTION = 'PROMOTION',
  GRADE_ADJUSTMENT = 'GRADE_ADJUSTMENT',
  PERFORMANCE_INCREASE = 'PERFORMANCE_INCREASE',
  MARKET_ADJUSTMENT = 'MARKET_ADJUSTMENT',
  DEPARTMENT_TRANSFER = 'DEPARTMENT_TRANSFER',
  POSITION_CHANGE = 'POSITION_CHANGE',
  ANNUAL_INCREMENT = 'ANNUAL_INCREMENT',
}

export class CreateSalaryHistoryDto {
  @ApiProperty({ example: 123 })
  @IsNumber()
  @IsNotEmpty()
  employeeId: number;

  @ApiProperty({ enum: SalaryChangeType, example: SalaryChangeType.PROMOTION })
  @IsEnum(SalaryChangeType)
  @IsNotEmpty()
  changeType: SalaryChangeType;

  @ApiProperty({ example: 5000000, required: false })
  @IsNumber()
  @IsOptional()
  oldBaseSalary?: number;

  @ApiProperty({ example: 6000000 })
  @IsNumber()
  @IsNotEmpty()
  newBaseSalary: number;

  @ApiProperty({ example: 'Grade 5', required: false })
  @IsString()
  @IsOptional()
  oldGrade?: string;

  @ApiProperty({ example: 'Grade 6', required: false })
  @IsString()
  @IsOptional()
  newGrade?: string;

  @ApiProperty({ example: 'Software Engineer', required: false })
  @IsString()
  @IsOptional()
  oldPosition?: string;

  @ApiProperty({ example: 'Senior Software Engineer', required: false })
  @IsString()
  @IsOptional()
  newPosition?: string;

  @ApiProperty({ example: 'Engineering', required: false })
  @IsString()
  @IsOptional()
  oldDepartment?: string;

  @ApiProperty({ example: 'Engineering', required: false })
  @IsString()
  @IsOptional()
  newDepartment?: string;

  @ApiProperty({ example: 'Promoted to senior position' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ example: '2024-01-01' })
  @IsDateString()
  @IsNotEmpty()
  effectiveDate: string;

  @ApiProperty({ example: 456, required: false })
  @IsNumber()
  @IsOptional()
  approvedBy?: number;
}
