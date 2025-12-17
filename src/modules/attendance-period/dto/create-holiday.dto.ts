import { IsString, IsNotEmpty, IsDateString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class CreateHolidayDto {
  @ApiProperty({ 
    example: 'New Year\'s Day',
    description: 'Name of the holiday'
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ 
    example: '2024-01-01',
    description: 'Date of the holiday (YYYY-MM-DD)'
  })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ 
    example: 1,
    description: 'ID of the attendance period this holiday belongs to',
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => value ? BigInt(value) : undefined)
  attendancePeriodId?: bigint;

  @ApiProperty({ 
    example: true,
    description: 'Whether this is a national holiday',
    required: false
  })
  @IsOptional()
  @IsBoolean()
  isNational?: boolean;

  @ApiProperty({ 
    example: false,
    description: 'Whether this holiday recurs annually',
    required: false
  })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiProperty({ 
    example: 'National holiday celebrating the new year',
    description: 'Optional description of the holiday',
    required: false
  })
  @IsOptional()
  @IsString()
  description?: string;
}