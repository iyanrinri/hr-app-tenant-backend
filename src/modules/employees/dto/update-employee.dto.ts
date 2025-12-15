import { IsString, IsEmail, IsNumber, IsDateString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateEmployeeDto {
  @ApiProperty({ 
    example: 'john.doe@company.com',
    description: 'Employee email address',
    required: false
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ 
    example: 'NewPassword123!',
    description: 'New password (only if you want to change it)',
    required: false
  })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password?: string;

  @ApiProperty({ 
    example: 'John',
    description: 'Employee first name',
    required: false
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ 
    example: 'Doe',
    description: 'Employee last name',
    required: false
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ 
    example: 'Senior Software Engineer',
    description: 'Employee position/job title',
    required: false
  })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiProperty({ 
    example: 'Engineering',
    description: 'Employee department',
    required: false
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ 
    example: '2024-01-01T00:00:00Z',
    description: 'Employee join date',
    required: false
  })
  @IsOptional()
  @IsDateString()
  joinDate?: string;

  @ApiProperty({ 
    example: 456,
    description: 'Manager Employee ID (set to null to remove manager)',
    required: false
  })
  @IsOptional()
  @IsNumber()
  managerId?: number;

  // Note: Salary updates should be done through salary module
}
