import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SettingDataType {
  STRING = 'STRING',
  INTEGER = 'INTEGER',
  BOOLEAN = 'BOOLEAN',
  JSON = 'JSON',
  FILE = 'STRING', // File paths stored as strings
}

export enum SettingCategory {
  COMPANY = 'COMPANY',
  ATTENDANCE = 'ATTENDANCE',
  GENERAL = 'GENERAL',
  NOTIFICATION = 'NOTIFICATION',
  SECURITY = 'SECURITY',
}

export class CreateSettingDto {
  @ApiProperty({ 
    description: 'Unique setting key',
    example: 'company_name' 
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ 
    description: 'Setting value (will be stored as string, parsed based on dataType)',
    example: 'PT. Contoh Teknologi Indonesia' 
  })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiProperty({ 
    description: 'Setting category for grouping',
    enum: SettingCategory,
    example: SettingCategory.COMPANY 
  })
  @IsEnum(SettingCategory)
  category: SettingCategory;

  @ApiProperty({ 
    description: 'Optional description of the setting',
    example: 'Company name displayed in application header',
    required: false 
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    description: 'Data type for proper parsing and validation',
    enum: SettingDataType,
    example: SettingDataType.STRING 
  })
  @IsEnum(SettingDataType)
  dataType: SettingDataType;

  @ApiProperty({ 
    description: 'Whether this setting can be accessed by all users',
    example: true 
  })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean = false;
}