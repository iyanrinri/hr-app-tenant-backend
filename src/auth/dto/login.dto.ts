import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLoginDto {
  @ApiProperty({
    example: 'admin@testcorp.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'TestPassword@123',
    description: 'User password (minimum 6 characters)',
  })
  @IsString()
  @MinLength(6)
  password: string;
}

export class UpdatePasswordDto {
  @ApiProperty({
    example: 'TestPassword@123',
    description: 'Current password',
  })
  @IsString()
  @MinLength(6)
  oldPassword: string;

  @ApiProperty({
    example: 'NewPassword@456',
    description: 'New password (minimum 6 characters)',
  })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
