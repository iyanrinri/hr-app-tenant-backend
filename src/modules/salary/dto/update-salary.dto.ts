import { IsString, IsNumber, IsDateString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSalaryDto {
  @ApiProperty({ example: 5500000, required: false })
  @IsNumber()
  @IsOptional()
  baseSalary?: number;

  @ApiProperty({ example: 600000, required: false })
  @IsNumber()
  @IsOptional()
  allowances?: number;

  @ApiProperty({ example: 'Grade 6', required: false })
  @IsString()
  @IsOptional()
  grade?: string;

  @ApiProperty({ example: '2024-12-31', required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: 'Updated salary notes', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
