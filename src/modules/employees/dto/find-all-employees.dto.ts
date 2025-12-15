import { IsOptional, IsInt, Min, IsString, IsIn } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FindAllEmployeesDto {
  @ApiPropertyOptional({ 
    description: 'Enable pagination (1 for paginated, 0 or omit for all)',
    example: 1,
    type: Number
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value))
  @IsInt()
  paginated?: number;

  @ApiPropertyOptional({
    description: 'Page number (only when paginated=1)',
    example: 1,
    minimum: 1,
    default: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page (only when paginated=1)',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Search term for firstName, lastName, email, position, or department',
    example: 'john',
    type: String
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by employee status',
    enum: ['active', 'inactive'],
    example: 'active'
  })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive'])
  status?: string;
}