import {
  IsString,
  IsEmail,
  IsDateString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  ValidateIf,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum RoleEnum {
  ADMIN = 'ADMIN',
  HR = 'HR',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

export enum EmploymentStatusEnum {
  PERMANENT = 'PERMANENT',
  CONTRACT = 'CONTRACT',
  TEMPORARY = 'TEMPORARY',
  INTERNSHIP = 'INTERNSHIP',
}

export enum GenderEnum {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum MaritalStatusEnum {
  SINGLE = 'SINGLE',
  MARRIED = 'MARRIED',
  DIVORCED = 'DIVORCED',
  WIDOWED = 'WIDOWED',
}

// Create DTO
export class CreateEmployeeDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'User password (auto-generated if not provided)',
    example: 'SecurePassword123',
  })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty({
    description: 'Employee first name',
    example: 'John',
  })
  @IsString()
  firstName: string;

  @ApiProperty({
    description: 'Employee last name',
    example: 'Doe',
  })
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'Job position',
    example: 'Senior Developer',
  })
  @IsString()
  position: string;

  @ApiProperty({
    description: 'Department',
    example: 'Engineering',
  })
  @IsString()
  department: string;

  @ApiProperty({
    description: 'Join date (ISO 8601 format)',
    example: '2024-01-15T00:00:00Z',
  })
  @IsDateString()
  joinDate: string;

  @ApiPropertyOptional({
    description: 'Employee number',
    example: 'EMP001',
  })
  @IsString()
  @IsOptional()
  employeeNumber?: string;

  @ApiPropertyOptional({
    description: 'Date of birth',
    example: '1990-01-15T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    description: 'Gender',
    enum: GenderEnum,
  })
  @IsEnum(GenderEnum)
  @IsOptional()
  gender?: GenderEnum;

  @ApiPropertyOptional({
    description: 'Marital status',
    enum: MaritalStatusEnum,
  })
  @IsEnum(MaritalStatusEnum)
  @IsOptional()
  maritalStatus?: MaritalStatusEnum;

  @ApiPropertyOptional({
    description: 'Nationality',
    example: 'Indonesian',
  })
  @IsString()
  @IsOptional()
  nationality?: string;

  @ApiPropertyOptional({
    description: 'Religion',
    example: 'Islam',
  })
  @IsString()
  @IsOptional()
  religion?: string;

  @ApiPropertyOptional({
    description: 'Blood type',
    example: 'O+',
  })
  @IsString()
  @IsOptional()
  bloodType?: string;

  @ApiPropertyOptional({
    description: 'ID number (e.g., passport or national ID)',
    example: '1234567890123456',
  })
  @IsString()
  @IsOptional()
  idNumber?: string;

  @ApiPropertyOptional({
    description: 'Tax number',
    example: 'TAX123456',
  })
  @IsString()
  @IsOptional()
  taxNumber?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+62812345678',
  })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Alternative phone number',
    example: '+62812345679',
  })
  @IsString()
  @IsOptional()
  alternativePhone?: string;

  @ApiPropertyOptional({
    description: 'Address',
    example: 'Jl. Example No. 123',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'City',
    example: 'Jakarta',
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    description: 'Province/State',
    example: 'DKI Jakarta',
  })
  @IsString()
  @IsOptional()
  province?: string;

  @ApiPropertyOptional({
    description: 'Postal code',
    example: '12345',
  })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({
    description: 'Emergency contact name',
    example: 'Jane Doe',
  })
  @IsString()
  @IsOptional()
  emergencyContactName?: string;

  @ApiPropertyOptional({
    description: 'Emergency contact phone',
    example: '+62812345680',
  })
  @IsString()
  @IsOptional()
  emergencyContactPhone?: string;

  @ApiPropertyOptional({
    description: 'Emergency contact relation',
    example: 'Spouse',
  })
  @IsString()
  @IsOptional()
  emergencyContactRelation?: string;

  @ApiPropertyOptional({
    description: 'Bank name',
    example: 'Bank Indonesia',
  })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiPropertyOptional({
    description: 'Bank account number',
    example: '123456789',
  })
  @IsString()
  @IsOptional()
  bankAccountNumber?: string;

  @ApiPropertyOptional({
    description: 'Bank account name',
    example: 'John Doe',
  })
  @IsString()
  @IsOptional()
  bankAccountName?: string;

  @ApiPropertyOptional({
    description: 'Employment status',
    enum: EmploymentStatusEnum,
  })
  @IsEnum(EmploymentStatusEnum)
  @IsOptional()
  employmentStatus?: EmploymentStatusEnum;

  @ApiPropertyOptional({
    description: 'Contract start date',
    example: '2024-01-15T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  contractStartDate?: string;

  @ApiPropertyOptional({
    description: 'Contract end date',
    example: '2025-01-15T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  contractEndDate?: string;

  @ApiPropertyOptional({
    description: 'Work location',
    example: 'Jakarta Office',
  })
  @IsString()
  @IsOptional()
  workLocation?: string;

  @ApiPropertyOptional({
    description: 'Base salary',
    example: 75000000,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  baseSalary?: number;

  @ApiPropertyOptional({
    description: 'Allowances',
    example: 5000000,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  allowances?: number;

  @ApiPropertyOptional({
    description: 'Manager ID (for hierarchy)',
    example: '1',
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  managerId?: number;
}

// Update DTO
export class UpdateEmployeeDto {
  @ApiPropertyOptional({
    description: 'Email address (only updatable by HR/ADMIN/SUPER)',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Employee first name',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Employee last name',
    example: 'Doe',
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Job position',
    example: 'Senior Developer',
  })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({
    description: 'Department',
    example: 'Engineering',
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({
    description: 'Employee number',
    example: 'EMP001',
  })
  @IsString()
  @IsOptional()
  employeeNumber?: string;

  @ApiPropertyOptional({
    description: 'Date of birth',
    example: '1990-01-15T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    description: 'Gender',
    enum: GenderEnum,
  })
  @IsEnum(GenderEnum)
  @IsOptional()
  gender?: GenderEnum;

  @ApiPropertyOptional({
    description: 'Marital status',
    enum: MaritalStatusEnum,
  })
  @IsEnum(MaritalStatusEnum)
  @IsOptional()
  maritalStatus?: MaritalStatusEnum;

  @ApiPropertyOptional({
    description: 'Nationality',
    example: 'Indonesian',
  })
  @IsString()
  @IsOptional()
  nationality?: string;

  @ApiPropertyOptional({
    description: 'Religion',
    example: 'Islam',
  })
  @IsString()
  @IsOptional()
  religion?: string;

  @ApiPropertyOptional({
    description: 'Blood type',
    example: 'O+',
  })
  @IsString()
  @IsOptional()
  bloodType?: string;

  @ApiPropertyOptional({
    description: 'ID number',
    example: '1234567890123456',
  })
  @IsString()
  @IsOptional()
  idNumber?: string;

  @ApiPropertyOptional({
    description: 'Tax number',
    example: 'TAX123456',
  })
  @IsString()
  @IsOptional()
  taxNumber?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+62812345678',
  })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Alternative phone number',
    example: '+62812345679',
  })
  @IsString()
  @IsOptional()
  alternativePhone?: string;

  @ApiPropertyOptional({
    description: 'Address',
    example: 'Jl. Example No. 123',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'City',
    example: 'Jakarta',
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    description: 'Province/State',
    example: 'DKI Jakarta',
  })
  @IsString()
  @IsOptional()
  province?: string;

  @ApiPropertyOptional({
    description: 'Postal code',
    example: '12345',
  })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({
    description: 'Emergency contact name',
    example: 'Jane Doe',
  })
  @IsString()
  @IsOptional()
  emergencyContactName?: string;

  @ApiPropertyOptional({
    description: 'Emergency contact phone',
    example: '+62812345680',
  })
  @IsString()
  @IsOptional()
  emergencyContactPhone?: string;

  @ApiPropertyOptional({
    description: 'Emergency contact relation',
    example: 'Spouse',
  })
  @IsString()
  @IsOptional()
  emergencyContactRelation?: string;

  @ApiPropertyOptional({
    description: 'Bank name',
    example: 'Bank Indonesia',
  })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiPropertyOptional({
    description: 'Bank account number',
    example: '123456789',
  })
  @IsString()
  @IsOptional()
  bankAccountNumber?: string;

  @ApiPropertyOptional({
    description: 'Bank account name',
    example: 'John Doe',
  })
  @IsString()
  @IsOptional()
  bankAccountName?: string;

  @ApiPropertyOptional({
    description: 'Employment status',
    enum: EmploymentStatusEnum,
  })
  @IsEnum(EmploymentStatusEnum)
  @IsOptional()
  employmentStatus?: EmploymentStatusEnum;

  @ApiPropertyOptional({
    description: 'Contract start date',
    example: '2024-01-15T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  contractStartDate?: string;

  @ApiPropertyOptional({
    description: 'Contract end date',
    example: '2025-01-15T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  contractEndDate?: string;

  @ApiPropertyOptional({
    description: 'Work location',
    example: 'Jakarta Office',
  })
  @IsString()
  @IsOptional()
  workLocation?: string;

  @ApiPropertyOptional({
    description: 'Base salary',
    example: 75000000,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  baseSalary?: number;

  @ApiPropertyOptional({
    description: 'Allowances',
    example: 5000000,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  allowances?: number;

  @ApiPropertyOptional({
    description: 'Is active',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Manager ID (for hierarchy)',
    example: '1',
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  managerId?: number;
}

// Hierarchy DTOs
export class SetManagerDto {
  @ApiProperty({
    description: 'Manager ID',
    example: '1',
  })
  @IsNumber()
  @Type(() => Number)
  managerId: number;
}

export class AssignSubordinatesDto {
  @ApiProperty({
    description: 'Array of subordinate employee IDs',
    example: [2, 3, 4],
    type: [Number],
  })
  @IsOptional()
  subordinateIds?: number[];
}

// Query/Filter DTOs
export class FindAllEmployeesDto {
  @ApiPropertyOptional({
    description: 'Enable pagination (0 or 1)',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  paginated?: number = 1;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Search by name, position, or department',
    example: 'John',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by department',
    example: 'Engineering',
  })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({
    description: 'Filter by employment status',
    enum: EmploymentStatusEnum,
  })
  @IsEnum(EmploymentStatusEnum)
  @IsOptional()
  employmentStatus?: EmploymentStatusEnum;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by manager ID',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  managerId?: number;

  @ApiPropertyOptional({
    description: 'Sort by field (firstName, lastName, position, joinDate, createdAt)',
    example: 'firstName',
  })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order (asc or desc)',
    example: 'asc',
  })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'asc';
}

// User Profile DTO for association
export class UserProfileDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// Profile DTOs
export class EmployeeProfileDto {
  @ApiProperty({
    description: 'Employee ID',
    example: '1',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: '1',
  })
  userId: string | null;

  @ApiProperty({
    description: 'Associated user information',
    type: () => UserProfileDto,
  })
  user?: UserProfileDto | null;

  // Basic Information
  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'john.doe@example.com',
  })
  email?: string | null;

  @ApiProperty()
  position: string;

  @ApiProperty()
  department: string;

  @ApiProperty()
  joinDate: Date;

  // Personal Information
  @ApiPropertyOptional()
  employeeNumber?: string | null;

  @ApiPropertyOptional()
  dateOfBirth?: Date | null;

  @ApiPropertyOptional()
  gender?: string | null;

  @ApiPropertyOptional()
  maritalStatus?: string | null;

  @ApiPropertyOptional()
  nationality?: string | null;

  @ApiPropertyOptional()
  religion?: string | null;

  @ApiPropertyOptional()
  bloodType?: string | null;

  @ApiPropertyOptional()
  idNumber?: string | null;

  @ApiPropertyOptional()
  taxNumber?: string | null;

  // Contact Information
  @ApiPropertyOptional()
  phoneNumber?: string | null;

  @ApiPropertyOptional()
  alternativePhone?: string | null;

  @ApiPropertyOptional()
  address?: string | null;

  @ApiPropertyOptional()
  city?: string | null;

  @ApiPropertyOptional()
  province?: string | null;

  @ApiPropertyOptional()
  postalCode?: string | null;

  @ApiPropertyOptional()
  emergencyContactName?: string | null;

  @ApiPropertyOptional()
  emergencyContactPhone?: string | null;

  @ApiPropertyOptional()
  emergencyContactRelation?: string | null;

  // Bank Information
  @ApiPropertyOptional()
  bankName?: string | null;

  @ApiPropertyOptional()
  bankAccountNumber?: string | null;

  @ApiPropertyOptional()
  bankAccountName?: string | null;

  // Employment Details
  @ApiPropertyOptional()
  employmentStatus?: string | null;

  @ApiPropertyOptional()
  contractStartDate?: Date | null;

  @ApiPropertyOptional()
  contractEndDate?: Date | null;

  @ApiPropertyOptional()
  workLocation?: string | null;

  @ApiPropertyOptional()
  baseSalary?: number | null;

  @ApiPropertyOptional()
  allowances?: number | null;

  // Profile
  @ApiPropertyOptional()
  profilePicture?: string | null;

  // Hierarchy
  @ApiPropertyOptional()
  managerId?: number | null;

  // Status & Audit
  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  deletedAt?: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// Response DTOs
export class EmployeeResponseDto {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  joinDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedEmployeeResponseDto {
  @ApiProperty({ type: [EmployeeProfileDto] })
  data: EmployeeProfileDto[];

  @ApiProperty({
    example: 1,
  })
  page: number;

  @ApiProperty({
    example: 10,
  })
  limit: number;

  @ApiProperty({
    example: 25,
  })
  total: number;

  @ApiProperty({
    example: 3,
  })
  pages: number;
}

export class OrganizationNodeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  position: string;

  @ApiProperty({ required: false })
  department?: string;
}

export class OrganizationTreeDto {
  @ApiProperty({ type: OrganizationNodeDto, required: false })
  manager?: OrganizationNodeDto;

  @ApiProperty({ type: OrganizationNodeDto })
  employee: OrganizationNodeDto;

  @ApiProperty({ type: [OrganizationNodeDto], required: false })
  siblings?: OrganizationNodeDto[];

  @ApiProperty({ type: [OrganizationNodeDto] })
  subordinates: OrganizationNodeDto[];
}
