import { IsNotEmpty, IsString, IsOptional, IsNumber, IsLatitude, IsLongitude } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ClockOutDto {
  @ApiProperty({ 
    example: -6.2088,
    description: 'Latitude coordinate of clock-out location'
  })
  @IsNumber()
  @IsLatitude()
  @IsNotEmpty()
  latitude: number;

  @ApiProperty({ 
    example: 106.8456,
    description: 'Longitude coordinate of clock-out location'
  })
  @IsNumber()
  @IsLongitude()
  @IsNotEmpty()
  longitude: number;

  @ApiProperty({ 
    example: 'Jl. Sudirman No. 1, Jakarta',
    description: 'Human-readable address of the location',
    required: false
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ 
    example: 'Completed all tasks for today',
    description: 'Optional notes for clock-out',
    required: false
  })
  @IsOptional()
  @IsString()
  notes?: string;
}