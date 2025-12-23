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
  @ApiProperty({ type: () => PayslipDeductionDto, isArray: true })
  @Expose()
  @Type(() => PayslipDeductionDto)
  deductions?: PayslipDeductionDto[];

  constructor(partial: Partial<PayslipResponseDto>) {
    Object.assign(this, partial);
  }
}
