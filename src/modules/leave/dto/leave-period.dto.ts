import { IsString, IsNotEmpty, IsDateString, IsBoolean, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeavePeriodDto {
  @ApiProperty({ 
    example: 'Annual Leave 2024',
    description: 'Name of the leave period'
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ 
    example: '2024-01-01',
    description: 'Start date of the leave period'
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ 
    example: '2024-12-31',
    description: 'End date of the leave period'
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({ 
    example: 'Annual leave allocation for 2024',
    description: 'Description of the leave period'
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateLeavePeriodDto {
  @ApiPropertyOptional({ 
    example: 'Annual Leave 2024 Updated',
    description: 'Name of the leave period'
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ 
    example: '2024-01-01',
    description: 'Start date of the leave period'
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ 
    example: '2024-12-31',
    description: 'End date of the leave period'
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ 
    example: false,
    description: 'Whether the leave period is active'
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ 
    example: 'Updated description',
    description: 'Description of the leave period'
  })
  @IsOptional()
  @IsString()
  description?: string;
}