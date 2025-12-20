import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SalaryChangeType } from './create-salary-history.dto';

export class SalaryResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: '123' })
  employeeId: string;

  @ApiProperty({ example: '5000000' })
  baseSalary: string;

  @ApiProperty({ example: '500000' })
  allowances: string;

  @ApiProperty({ example: 'Grade 5' })
  grade?: string;

  @ApiProperty({ example: '2024-01-01' })
  effectiveDate: Date;

  @ApiProperty({ example: '2024-12-31' })
  endDate?: Date;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 'Annual salary adjustment' })
  notes?: string;

  @ApiProperty({ example: '1' })
  createdBy: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  updatedAt: Date;

  @ApiPropertyOptional()
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    position: string;
    department: string;
  };
}

export class SalaryHistoryResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: '123' })
  employeeId: string;

  @ApiProperty({ enum: SalaryChangeType, example: SalaryChangeType.PROMOTION })
  changeType: SalaryChangeType;

  @ApiProperty({ example: '5000000' })
  oldBaseSalary?: string;

  @ApiProperty({ example: '6000000' })
  newBaseSalary: string;

  @ApiProperty({ example: 'Grade 5' })
  oldGrade?: string;

  @ApiProperty({ example: 'Grade 6' })
  newGrade?: string;

  @ApiProperty({ example: 'Software Engineer' })
  oldPosition?: string;

  @ApiProperty({ example: 'Senior Software Engineer' })
  newPosition?: string;

  @ApiProperty({ example: 'Engineering' })
  oldDepartment?: string;

  @ApiProperty({ example: 'Engineering' })
  newDepartment?: string;

  @ApiProperty({ example: 'Promoted to senior position' })
  reason: string;

  @ApiProperty({ example: '2024-01-01' })
  effectiveDate: Date;

  @ApiProperty({ example: '456' })
  approvedBy?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  createdAt: Date;

  @ApiPropertyOptional()
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    position: string;
    department: string;
  };
}
