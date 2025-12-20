import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class PayrollDto {
  @ApiProperty({
    description: 'Payroll ID',
    example: '1',
  })
  @Transform(({ value }) => value?.toString())
  id: string;

  @ApiProperty({
    description: 'Employee ID',
    example: '1',
  })
  @Transform(({ value }) => value?.toString())
  employeeId: string;

  @ApiProperty({
    description: 'Payroll period start date',
    example: '2024-01-01T00:00:00Z',
  })
  periodStart: Date;

  @ApiProperty({
    description: 'Payroll period end date',
    example: '2024-01-31T23:59:59Z',
  })
  periodEnd: Date;

  @ApiProperty({
    description: 'Base salary amount',
    example: '5000000.00',
  })
  @Transform(({ value }) => value?.toString())
  baseSalary: string;

  @ApiProperty({
    description: 'Overtime pay amount',
    example: '750000.00',
  })
  @Transform(({ value }) => value?.toString())
  overtimePay: string;

  @ApiProperty({
    description: 'Deductions amount',
    example: '250000.00',
  })
  @Transform(({ value }) => value?.toString())
  deductions: string;

  @ApiProperty({
    description: 'Bonuses amount',
    example: '500000.00',
  })
  @Transform(({ value }) => value?.toString())
  bonuses: string;

  @ApiProperty({
    description: 'Gross salary (base + overtime + bonuses)',
    example: '6250000.00',
  })
  @Transform(({ value }) => value?.toString())
  grossSalary: string;

  @ApiProperty({
    description: 'Net salary after deductions',
    example: '6000000.00',
  })
  @Transform(({ value }) => value?.toString())
  netSalary: string;

  @ApiProperty({
    description: 'Total overtime hours',
    example: '10.5',
  })
  @Transform(({ value }) => value?.toString())
  overtimeHours: string;

  @ApiProperty({
    description: 'Total regular working hours',
    example: '168.0',
  })
  @Transform(({ value }) => value?.toString())
  regularHours: string;

  @ApiProperty({
    description: 'Payment status',
    example: false,
  })
  isPaid: boolean;

  @ApiPropertyOptional({
    description: 'Date when payroll was processed',
    example: '2024-02-01T10:30:00Z',
  })
  processedAt?: Date;

  @ApiPropertyOptional({
    description: 'ID of user who processed the payroll',
    example: '1',
  })
  @Transform(({ value }) => value?.toString())
  processedBy?: string;

  @ApiProperty({
    description: 'Creation date',
    example: '2024-01-31T23:59:59Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2024-02-01T10:30:00Z',
  })
  updatedAt: Date;

  // Relations
  @ApiPropertyOptional({
    description: 'Employee information',
  })
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    position: string;
    department: string;
  };

  @ApiPropertyOptional({
    description: 'Processor information',
  })
  processor?: {
    id: string;
    email: string;
  };
}

export class PayrollListResponseDto {
  @ApiProperty({
    description: 'Array of payroll records',
    type: [PayrollDto],
  })
  data: PayrollDto[];

  @ApiProperty({
    description: 'Total number of records',
    example: 25,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of records per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 3,
  })
  totalPages: number;
}