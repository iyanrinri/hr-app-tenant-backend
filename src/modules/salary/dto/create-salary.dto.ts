import { IsString, IsNotEmpty, IsNumber, IsDateString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSalaryDto {
  @ApiProperty({ example: 123 })
  @IsNumber()
  @IsNotEmpty()
  employeeId: number;

  @ApiProperty({ example: 5000000 })
  @IsNumber()
  @IsNotEmpty()
  baseSalary: number;

  @ApiProperty({ example: 500000, required: false })
  @IsNumber()
  @IsOptional()
  allowances?: number;

  @ApiProperty({ example: 'Grade 5', required: false })
  @IsString()
  @IsOptional()
  grade?: string;

  @ApiProperty({ example: '2024-01-01' })
  @IsDateString()
  @IsNotEmpty()
  effectiveDate: string;

  @ApiProperty({ example: '2024-12-31', required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: 'Annual salary adjustment', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  createdBy: number;
}
