import { IsOptional, IsEnum, IsString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { SettingCategory } from './create-setting.dto';

export class SettingsFilterDto {
  @ApiProperty({ 
    description: 'Filter by category',
    enum: SettingCategory,
    required: false 
  })
  @IsOptional()
  @IsEnum(SettingCategory)
  category?: SettingCategory;

  @ApiProperty({ 
    description: 'Search in key or description',
    required: false 
  })
  @IsOptional()
  @IsString()
  searchTerm?: string;

  @ApiProperty({ 
    description: 'Filter by public settings only',
    required: false 
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isPublic?: boolean;

  @ApiProperty({ 
    description: 'Page number for pagination',
    example: 1,
    required: false 
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value))
  page?: number = 1;

  @ApiProperty({ 
    description: 'Items per page',
    example: 10,
    required: false 
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value))
  limit?: number = 10;
}