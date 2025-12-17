import { IsOptional, IsString, IsBoolean, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class FindAllPeriodsDto {
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
    example: '2024',
    description: 'Search in period name',
    required: false
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ 
    example: true,
    description: 'Filter by active status',
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;
}