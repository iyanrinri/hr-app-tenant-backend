import { IsNotEmpty, IsString, IsOptional, IsNumber, IsLatitude, IsLongitude } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ClockInDto {
  @ApiProperty({ 
    example: -6.2088,
    description: 'Latitude coordinate of clock-in location'
  })
  @IsNumber()
  @IsLatitude()
  @IsNotEmpty()
  latitude: number;

  @ApiProperty({ 
    example: 106.8456,
    description: 'Longitude coordinate of clock-in location'
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
    example: 'Starting work for the day',
    description: 'Optional notes for clock-in',
    required: false
  })
  @IsOptional()
  @IsString()
  notes?: string;
}