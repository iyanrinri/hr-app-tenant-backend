import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { MultiTenantPrismaService } from '@/database/multi-tenant-prisma.service';
import { PayslipRepository } from '../repositories/payslip.repository';
import { TaxCalculationService } from './tax-calculation.service';
import { BPJSCalculationService } from './bpjs-calculation.service';
import { GeneratePayslipDto } from '../dto/generate-payslip.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PayslipService {
  constructor(
    private readonly prisma: MultiTenantPrismaService,
    private readonly payslipRepository: PayslipRepository,
    private readonly taxService: TaxCalculationService,
    private readonly bpjsService: BPJSCalculationService,
  ) {}

  /**
   * Generate payslip from existing payroll
   * Calculates PPh 21 tax and BPJS deductions
   */
  async generatePayslip(tenantSlug: string, dto: GeneratePayslipDto, generatedBy: bigint) {
    // 1. Get payroll data
    const payroll = await this.payslipRepository.getPayrollWithEmployee(
      tenantSlug,
      BigInt(dto.payrollId),
    );

    if (!payroll) {
      throw new NotFoundException(`Payroll with ID ${dto.payrollId} not found`);
    }

    // Check if payslip already exists
    const existingPayslip = await this.payslipRepository.findByPayrollId(
      tenantSlug,
      payroll.id,
    );
    if (existingPayslip) {
      throw new BadRequestException(
        'Payslip already generated for this payroll period',
      );
    }

    // 2. Calculate gross salary (including overtime and bonuses from payroll)
    const grossSalary = Number(payroll.baseSalary);
    const overtimePay = Number(payroll.overtimePay);
    const bonuses = Number(payroll.bonuses);
    const allowances = dto.additionalAllowances || 0;

    // Monthly gross for tax calculation
    const monthlyGross = grossSalary + overtimePay + bonuses + allowances;

    // 3. Calculate PPh 21 Tax
    const maritalStatus = payroll.employee.maritalStatus as
      | 'SINGLE'
      | 'MARRIED'
      | null;
    const dependents = dto.dependents || 0;

    const taxResult = await this.taxService.calculatePPh21(
      tenantSlug,
      monthlyGross,
      maritalStatus,
      dependents,
    );

    // 4. Calculate BPJS
    const jkkRisk = dto.jkkRiskCategory || 'LOW';
    const bpjsResult = await this.bpjsService.calculateBPJS(
      tenantSlug,
      grossSalary, // BPJS based on base salary only
      jkkRisk as any,
    );

    // 5. Calculate other deductions
    const otherDeductions = dto.otherDeductions || 0;

    // 6. Calculate take home pay
    const totalDeductions =
      taxResult.monthlyTax +
      bpjsResult.bpjsKesehatanEmployee +
      bpjsResult.bpjsKetenagakerjaanEmployee +
      otherDeductions;

    const takeHomePay = monthlyGross - totalDeductions;

    // 7. Create payslip
    const payslip = await this.payslipRepository.create(
      tenantSlug,
      {
        payrollId: payroll.id,
        grossSalary: grossSalary,
        overtimePay: overtimePay,
        bonuses: bonuses,
        allowances: allowances,
        taxAmount: taxResult.monthlyTax,
        bpjsKesehatanEmployee: bpjsResult.bpjsKesehatanEmployee,
        bpjsKesehatanCompany: bpjsResult.bpjsKesehatanCompany,
        bpjsKetenagakerjaanEmployee: bpjsResult.bpjsKetenagakerjaanEmployee,
        bpjsKetenagakerjaanCompany: bpjsResult.bpjsKetenagakerjaanCompany,
        otherDeductions: otherDeductions,
        takeHomePay: takeHomePay,
        taxCalculationDetails: {
          ...taxResult,
          dependents,
        },
        generatedBy: generatedBy,
      });

    // 8. Create deduction records for breakdown
    const deductions: any[] = [
      {
        payslipId: payslip.id,
        type: 'TAX',
        description: `PPh 21 (${taxResult.ptkpCategory})`,
        amount: taxResult.monthlyTax,
      },
      {
        payslipId: payslip.id,
        type: 'BPJS_KESEHATAN',
        description: 'BPJS Kesehatan (1%)',
        amount: bpjsResult.bpjsKesehatanEmployee,
      },
      {
        payslipId: payslip.id,
        type: 'BPJS_TK',
        description: `BPJS Ketenagakerjaan (JHT 2% + JP 1%)`,
        amount: bpjsResult.bpjsKetenagakerjaanEmployee,
      },
    ];

    if (otherDeductions > 0) {
      deductions.push({
        payslipId: payslip.id,
        type: 'OTHER',
        description: 'Other Deductions',
        amount: otherDeductions,
      });
    }

    await this.payslipRepository.createManyDeductions(tenantSlug, deductions);

    // Return created payslip with deductions
    return this.payslipRepository.findOne(tenantSlug, payslip.id);
  }

  /**
   * Get payslip by ID
   */
  async getPayslipById(tenantSlug: string, id: bigint) {
    const payslip = await this.payslipRepository.findOne(tenantSlug, id);
    if (!payslip) {
      throw new NotFoundException(`Payslip with ID ${id} not found`);
    }
    return payslip;
  }

  /**
   * Get payslip by payroll ID
   */
  async getPayslipByPayrollId(tenantSlug: string, payrollId: bigint) {
    const payslip = await this.payslipRepository.findByPayrollId(tenantSlug, payrollId);
    if (!payslip) {
      throw new NotFoundException(
        `Payslip for payroll ID ${payrollId} not found`,
      );
    }
    return payslip;
  }

  /**
   * Get employee's payslips
   */
  async getEmployeePayslips(tenantSlug: string, employeeId: bigint, limit: number = 10) {
    return this.payslipRepository.findByEmployeeId(tenantSlug, employeeId, limit);
  }

  /**
   * Delete payslip (admin only, for corrections)
   */
  async deletePayslip(tenantSlug: string, id: bigint) {
    const payslip = await this.payslipRepository.findOne(tenantSlug, id);
    if (!payslip) {
      throw new NotFoundException(`Payslip with ID ${id} not found`);
    }
    return this.payslipRepository.delete(tenantSlug, id);
  }
}

