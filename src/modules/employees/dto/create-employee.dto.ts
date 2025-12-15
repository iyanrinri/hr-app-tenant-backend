import { IsString, IsEmail, IsNotEmpty, IsNumber, IsDateString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'Software Engineer' })
  @IsString()
  @IsNotEmpty()
  position: string;

  @ApiProperty({ example: 'Engineering' })
  @IsString()
  @IsNotEmpty()
  department: string;

  @ApiProperty({ example: '2023-01-01T00:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  joinDate: string;

  @ApiProperty({ 
    example: 456, 
    description: 'Manager Employee ID (optional)',
    required: false
  })
  @IsOptional()
  @IsNumber()
  managerId?: number;

  // Salary will be managed separately via salary module
  @ApiProperty({ 
    example: 5000000, 
    description: 'Initial base salary (will create salary record)',
    required: false
  })
  @IsOptional()
  @IsNumber()
  initialSalary?: number;

  @ApiProperty({ 
    example: 500000, 
    description: 'Initial allowances (optional)',
    required: false
  })
  @IsOptional()
  @IsNumber()
  initialAllowances?: number;

  @ApiProperty({ 
    example: 'Grade 5', 
    description: 'Initial salary grade (optional)',
    required: false
  })
  @IsOptional()
  @IsString()
  initialGrade?: string;
}
