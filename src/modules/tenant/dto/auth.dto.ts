import { IsEmail, IsString, MinLength, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'Tenant email address',
    example: 'tenant@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Tenant name',
    example: 'My Company',
  })
  @IsString()
  tenantName: string;

  @ApiProperty({
    description: 'Tenant slug (alphanumeric and underscore only)',
    example: 'my_company',
  })
  @IsString()
  @Matches(/^[a-z0-9_]+$/, {
    message: 'Slug can only contain lowercase letters, numbers, and underscores',
  })
  slug: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  @IsString()
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'Password (minimum 6 characters)',
    example: 'Password123',
  })
  @IsString()
  @MinLength(6)
  password: string;
}

export class LoginDto {
  @ApiProperty({
    description: 'Email address',
    example: 'tenant@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password',
    example: 'Password123',
  })
  @IsString()
  password: string;
}

export class UserProfileDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
