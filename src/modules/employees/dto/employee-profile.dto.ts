import { IsString, IsEmail, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Define enums locally in DTO
const GenderEnum = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER',
} as const;

const MaritalStatusEnum = {
  SINGLE: 'SINGLE',
  MARRIED: 'MARRIED',
  DIVORCED: 'DIVORCED',
  WIDOWED: 'WIDOWED',
} as const;

const EmploymentStatusEnum = {
  PERMANENT: 'PERMANENT',
  CONTRACT: 'CONTRACT',
  PROBATION: 'PROBATION',
  INTERN: 'INTERN',
} as const;

export type Gender = keyof typeof GenderEnum;
export type MaritalStatus = keyof typeof MaritalStatusEnum;
export type EmploymentStatus = keyof typeof EmploymentStatusEnum;

export class UpdateEmployeeProfileDto {
  // Personal Information
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  employeeNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ required: false, enum: Object.values(GenderEnum) })
  @IsOptional()
  @IsEnum(GenderEnum)
  gender?: Gender;

  @ApiProperty({ required: false, enum: Object.values(MaritalStatusEnum) })
  @IsOptional()
  @IsEnum(MaritalStatusEnum)
  maritalStatus?: MaritalStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  religion?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bloodType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  idNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  taxNumber?: string;

  // Contact Information
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  alternativePhone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  emergencyContactRelation?: string;

  // Bank Information
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bankAccountName?: string;

  // Employment Details
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ required: false, enum: Object.values(EmploymentStatusEnum) })
  @IsOptional()
  @IsEnum(EmploymentStatusEnum)
  employmentStatus?: EmploymentStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  contractStartDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  contractEndDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  workLocation?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  joinDate?: string;
}

export class UploadProfilePictureResponseDto {
  @ApiProperty()
  url: string;

  @ApiProperty()
  filename: string;

  @ApiProperty()
  message: string;
}

export class EmployeeProfileResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  position: string;

  @ApiProperty()
  department: string;

  @ApiProperty()
  joinDate: string;

  @ApiProperty({ required: false })
  managerId?: number;

  @ApiProperty({ required: false })
  employeeNumber?: string;

  @ApiProperty({ required: false })
  dateOfBirth?: string;

  @ApiProperty({ required: false })
  gender?: string;

  @ApiProperty({ required: false })
  maritalStatus?: string;

  @ApiProperty({ required: false })
  nationality?: string;

  @ApiProperty({ required: false })
  religion?: string;

  @ApiProperty({ required: false })
  bloodType?: string;

  @ApiProperty({ required: false })
  idNumber?: string;

  @ApiProperty({ required: false })
  taxNumber?: string;

  @ApiProperty({ required: false })
  phoneNumber?: string;

  @ApiProperty({ required: false })
  alternativePhone?: string;

  @ApiProperty({ required: false })
  address?: string;

  @ApiProperty({ required: false })
  city?: string;

  @ApiProperty({ required: false })
  province?: string;

  @ApiProperty({ required: false })
  postalCode?: string;

  @ApiProperty({ required: false })
  emergencyContactName?: string;

  @ApiProperty({ required: false })
  emergencyContactPhone?: string;

  @ApiProperty({ required: false })
  emergencyContactRelation?: string;

  @ApiProperty({ required: false })
  bankName?: string;

  @ApiProperty({ required: false })
  bankAccountNumber?: string;

  @ApiProperty({ required: false })
  bankAccountName?: string;

  @ApiProperty({ required: false })
  employmentStatus?: string;

  @ApiProperty({ required: false })
  contractStartDate?: string;

  @ApiProperty({ required: false })
  contractEndDate?: string;

  @ApiProperty({ required: false })
  workLocation?: string;

  @ApiProperty({ required: false })
  profilePicture?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
