import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

export class PayslipDeductionDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  type: string;

  @ApiProperty()
  @Expose()
  description: string;

  @ApiProperty()
  @Expose()
  amount: string;
}

export class PayslipEmployeeDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  firstName: string;

  @ApiProperty()
  @Expose()
  lastName: string;

  @ApiProperty()
  @Expose()
  position: string;

  @ApiProperty()
  @Expose()
  department: string;

  @ApiProperty({ required: false })
  @Expose()
  employeeNumber?: string;

  @ApiProperty({ required: false })
  @Expose()
  maritalStatus?: string;
}

export class PayslipPayrollDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  periodStart: string;

  @ApiProperty()
  @Expose()
  periodEnd: string;

  @ApiProperty()
  @Expose()
  baseSalary: string;

  @ApiProperty()
  @Expose()
  overtimePay: string;

  @ApiProperty()
  @Expose()
  bonuses: string;

  @ApiProperty()
  @Expose()
  isPaid: boolean;

  @ApiProperty({ required: false })
  @Expose()
  paidAt?: string;

  @ApiProperty({ required: false })
  @Expose()
  processedAt?: string;

  @ApiProperty({ type: () => PayslipEmployeeDto })
  @Expose()
  @Type(() => PayslipEmployeeDto)
  employee: PayslipEmployeeDto;
}

export class PayslipResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  payrollId: string;

  // Income
  @ApiProperty()
  @Expose()
  grossSalary: string;

  @ApiProperty()
  @Expose()
  overtimePay: string;

  @ApiProperty()
  @Expose()
  bonuses: string;

  @ApiProperty()
  @Expose()
  allowances: string;

  // Deductions
  @ApiProperty()
  @Expose()
  taxAmount: string;

  @ApiProperty()
  @Expose()
  bpjsKesehatanEmployee: string;

  @ApiProperty()
  @Expose()
  bpjsKesehatanCompany: string;

  @ApiProperty()
  @Expose()
  bpjsKetenagakerjaanEmployee: string;

  @ApiProperty()
  @Expose()
  bpjsKetenagakerjaanCompany: string;

  @ApiProperty()
  @Expose()
  otherDeductions: string;

  // Take home
  @ApiProperty()
  @Expose()
  takeHomePay: string;

  // Tax calculation details
  @ApiProperty()
  @Expose()
  taxCalculationDetails: any;

  // Metadata
  @ApiProperty()
  @Expose()
  generatedAt: string;

  @ApiProperty()
  @Expose()
  generatedBy: string;

  @ApiProperty({ required: false })
  @Expose()
  pdfUrl?: string;

  @ApiProperty()
  @Expose()
  createdAt: string;

  @ApiProperty()
  @Expose()
  updatedAt: string;

  // Relations
  @ApiProperty({ type: () => PayslipPayrollDto })
  @Expose()
  @Type(() => PayslipPayrollDto)
  payroll: PayslipPayrollDto;

  @ApiProperty({ type: () => PayslipDeductionDto, isArray: true })
  @Expose()
  @Type(() => PayslipDeductionDto)
  deductions?: PayslipDeductionDto[];

  constructor(partial: Partial<PayslipResponseDto>) {
    Object.assign(this, partial);
  }
}
