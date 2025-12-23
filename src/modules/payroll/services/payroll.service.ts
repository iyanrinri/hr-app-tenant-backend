import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PayrollRepository } from '../repositories/payroll.repository';
import { SalaryService } from '../../salary/services/salary.service';
import { OvertimeRequestService } from '../../overtime/services/overtime-request.service';
import { SettingsService } from '../../settings/services/settings.service';
import { AttendanceService } from '../../attendance/services/attendance.service';
import { EmployeesService } from '../../employees/employees.service';
import { CreatePayrollDto, ProcessPayrollDto, BulkGeneratePayrollDto } from '../dto/create-payroll.dto';
import { PayrollQueryDto, PayrollStatus } from '../dto/payroll-query.dto';
import { PayrollDto, PayrollListResponseDto } from '../dto/payroll-response.dto';
import { OvertimeStatus } from '../../overtime/dto/update-overtime-request.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class PayrollService {
  constructor(
    private payrollRepository: PayrollRepository,
    private salaryService: SalaryService,
    private overtimeRequestService: OvertimeRequestService,
    private settingsService: SettingsService,
    private attendanceService: AttendanceService,
    private employeesService: EmployeesService,
  ) {}

  async createPayroll(tenantSlug: string, createPayrollDto: CreatePayrollDto, userId: string): Promise<PayrollDto> {
    const {
      employeeId,
      periodStart,
      periodEnd,
      deductions = '0',
      bonuses = '0',
      bonusPercentage = 0,
      overtimeRequestIds = [],
    } = createPayrollDto;

    // Check for existing payroll in the same period
    const existingPayroll = await this.payrollRepository.findByEmployeeAndPeriod(
      tenantSlug,
      employeeId,
      new Date(periodStart),
      new Date(periodEnd),
    );

    if (existingPayroll) {
      throw new BadRequestException(
        'Payroll already exists for this employee in the overlapping period',
      );
    }

    // Get current salary
    const currentSalary = await this.salaryService.getCurrentSalary(tenantSlug, parseInt(employeeId));
    if (!currentSalary) {
      throw new BadRequestException('No salary record found for this employee');
    }

    // Calculate regular hours based on attendance
    const regularHours = await this.calculateRegularHours(
      tenantSlug, 
      employeeId,
      new Date(periodStart),
      new Date(periodEnd),
    );

    // Calculate overtime pay (automatic)
    const overtimeCalculation = await this.calculateOvertimePay(
      tenantSlug, 
      employeeId,
      new Date(periodStart),
      new Date(periodEnd),
      overtimeRequestIds,
    );

    // Calculate bonus from percentage if provided
    const baseSalaryDecimal = new Prisma.Decimal(currentSalary.baseSalary);
    const bonusFromPercentage = bonusPercentage > 0 
      ? baseSalaryDecimal.times(bonusPercentage).dividedBy(100)
      : new Prisma.Decimal(0);
    
    const overtimePayDecimal = new Prisma.Decimal(overtimeCalculation.totalPay);
    const deductionsDecimal = new Prisma.Decimal(deductions);
    const bonusesDecimal = new Prisma.Decimal(bonuses).plus(bonusFromPercentage);

    const grossSalary = baseSalaryDecimal
      .plus(overtimePayDecimal)
      .plus(bonusesDecimal);

    const netSalary = grossSalary.minus(deductionsDecimal);

    const payrollData = {
      employeeId: BigInt(employeeId),
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      baseSalary: baseSalaryDecimal,
      overtimePay: overtimePayDecimal,
      deductions: deductionsDecimal,
      bonuses: bonusesDecimal,
      grossSalary,
      netSalary,
      overtimeHours: new Prisma.Decimal(overtimeCalculation.totalHours),
      regularHours: new Prisma.Decimal(regularHours),
      employee: {
        connect: { id: BigInt(employeeId) },
      },
    };

    const payroll = await this.payrollRepository.create(tenantSlug, payrollData);
    return this.transformPayrollToDto(payroll);
  }

  async findAll(tenantSlug: string, query: PayrollQueryDto): Promise<PayrollListResponseDto> {
    const result = await this.payrollRepository.findMany(tenantSlug, query);
    
    return {
      ...result,
      data: result.data.map((payroll: any) => this.transformPayrollToDto(payroll)),
    };
  }

  async findById(tenantSlug: string, id: string): Promise<PayrollDto> {
    const payroll = await this.payrollRepository.findById(tenantSlug, id);
    if (!payroll) {
      throw new NotFoundException('Payroll not found');
    }

    return this.transformPayrollToDto(payroll);
  }

  async processPayrolls(
    tenantSlug: string,
    processPayrollDto: ProcessPayrollDto,
    userId: string,
  ): Promise<{ processed: number; failed: string[] }> {
    const { payrollIds } = processPayrollDto;
    const failed: string[] = [];
    let processed = 0;

    for (const payrollId of payrollIds) {
      try {
        const payroll = await this.payrollRepository.findById(tenantSlug, payrollId);
        if (!payroll) {
          failed.push(`Payroll ${payrollId}: Not found`);
          continue;
        }

        if (payroll.processedAt) {
          failed.push(`Payroll ${payrollId}: Already processed`);
          continue;
        }

        await this.payrollRepository.update(tenantSlug, payrollId, {
          processedAt: new Date(),
        });

        processed++;
      } catch (error) {
        failed.push(`Payroll ${payrollId}: ${error.message}`);
      }
    }

    return { processed, failed };
  }

  async markAsPaid(tenantSlug: string, id: string, userId: string): Promise<PayrollDto> {
    const payroll = await this.payrollRepository.findById(tenantSlug, id);
    if (!payroll) {
      throw new NotFoundException('Payroll not found');
    }

    if (payroll.isPaid) {
      throw new BadRequestException('Payroll is already marked as paid');
    }

    if (!payroll.processedAt) {
      throw new BadRequestException('Payroll must be processed before marking as paid');
    }

    const updatedPayroll = await this.payrollRepository.update(tenantSlug, id, {
      isPaid: true,
      updatedAt: new Date(),
    });

    return this.transformPayrollToDto(updatedPayroll);
  }

  async deletePayroll(tenantSlug: string, id: string): Promise<void> {
    const payroll = await this.payrollRepository.findById(tenantSlug, id);
    if (!payroll) {
      throw new NotFoundException('Payroll not found');
    }

    if (payroll.isPaid) {
      throw new BadRequestException('Cannot delete a paid payroll');
    }

    await this.payrollRepository.delete(tenantSlug, id);
  }

  async getPayrollSummary(tenantSlug: string, employeeId?: string) {
    return this.payrollRepository.getPayrollSummary(tenantSlug, employeeId);
  }

  async bulkGeneratePayroll(
    tenantSlug: string,
    bulkGenerateDto: BulkGeneratePayrollDto,
    userId: string,
  ): Promise<{
    generated: number;
    failed: Array<{ employeeId: string; reason: string }>;
    payrolls: PayrollDto[];
  }> {
    const {
      periodStart,
      periodEnd,
      bonusPercentage = 0,
      deductions = {},
      employeeIds,
    } = bulkGenerateDto;

    const failed: Array<{ employeeId: string; reason: string }> = [];
    const payrolls: PayrollDto[] = [];

    // Get all active employees (or specific ones if provided)
    // For now, we'll use a simple approach - in production, fetch from employee repository
    const targetEmployeeIds = employeeIds && employeeIds.length > 0 
      ? employeeIds 
      : await this.getAllActiveEmployeeIds(tenantSlug);

    console.log('🔍 [BulkGenerate] Target employee IDs:', targetEmployeeIds);
    console.log('🔍 [BulkGenerate] Period:', periodStart, 'to', periodEnd);
    console.log('🔍 [BulkGenerate] Bonus %:', bonusPercentage);

    for (const employeeId of targetEmployeeIds) {
      try {
        // Check if payroll already exists
        const existingPayroll = await this.payrollRepository.findByEmployeeAndPeriod(
          tenantSlug,
          employeeId,
          new Date(periodStart),
          new Date(periodEnd),
        );

        if (existingPayroll) {
          failed.push({
            employeeId,
            reason: 'Payroll already exists for this period',
          });
          continue;
        }

        // Get employee's current salary
        const currentSalary = await this.salaryService.getCurrentSalary(
          tenantSlug,
          parseInt(employeeId),
        );

        if (!currentSalary) {
          failed.push({
            employeeId,
            reason: 'No salary record found',
          });
          continue;
        }

        // Calculate regular hours
        const regularHours = await this.calculateRegularHours(
          tenantSlug,
          employeeId,
          new Date(periodStart),
          new Date(periodEnd),
        );

        // Calculate overtime pay (automatic)
        const overtimeCalculation = await this.calculateOvertimePay(
          tenantSlug,
          employeeId,
          new Date(periodStart),
          new Date(periodEnd),
          [], // Auto-fetch approved overtime requests in the period
        );

        // Calculate bonuses
        const baseSalaryDecimal = new Prisma.Decimal(currentSalary.baseSalary);
        const bonusFromPercentage = bonusPercentage > 0
          ? baseSalaryDecimal.times(bonusPercentage).dividedBy(100)
          : new Prisma.Decimal(0);

        const overtimePayDecimal = new Prisma.Decimal(overtimeCalculation.totalPay);
        
        // Get employee-specific deduction (manual)
        const employeeDeduction = deductions[employeeId] || '0';
        const deductionsDecimal = new Prisma.Decimal(employeeDeduction);
        
        const bonusesDecimal = bonusFromPercentage;

        const grossSalary = baseSalaryDecimal
          .plus(overtimePayDecimal)
          .plus(bonusesDecimal);

        const netSalary = grossSalary.minus(deductionsDecimal);

        // Create payroll
        const payrollData = {
          employeeId: BigInt(employeeId),
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
          baseSalary: baseSalaryDecimal,
          overtimePay: overtimePayDecimal,
          deductions: deductionsDecimal,
          bonuses: bonusesDecimal,
          grossSalary,
          netSalary,
          overtimeHours: new Prisma.Decimal(overtimeCalculation.totalHours),
          regularHours: new Prisma.Decimal(regularHours),
          employee: {
            connect: { id: BigInt(employeeId) },
          },
        };

        const payroll = await this.payrollRepository.create(tenantSlug, payrollData);
        payrolls.push(this.transformPayrollToDto(payroll));
      } catch (error) {
        failed.push({
          employeeId,
          reason: error.message || 'Unknown error',
        });
      }
    }

    return {
      generated: payrolls.length,
      failed,
      payrolls,
    };
  }

  private async getAllActiveEmployeeIds(tenantSlug: string): Promise<string[]> {
    try {
      console.log('🔍 [getAllActiveEmployeeIds] Fetching employees for tenant:', tenantSlug);
      
      // Fetch all active employees from employee service
      const response = await this.employeesService.getEmployees(tenantSlug, {
        isActive: true,
        page: 1,
        limit: 1000, // Get all employees at once
      });
      
      console.log('🔍 [getAllActiveEmployeeIds] Response:', {
        total: response.total,
        count: response.data?.length,
        employees: response.data?.map(e => ({ id: e.id, name: `${e.firstName} ${e.lastName}` }))
      });
      
      // Handle empty response or no data
      if (!response.data || response.data.length === 0) {
        console.warn('⚠️ [getAllActiveEmployeeIds] No active employees found');
        return [];
      }
      
      return response.data.map(emp => emp.id?.toString() || String(emp.id));
    } catch (error) {
      console.error('❌ [getAllActiveEmployeeIds] Failed to fetch active employees:', error);
      throw new BadRequestException(`Failed to fetch active employees: ${error.message}`);
    }
  }

  private async calculateRegularHours(  
    tenantSlug: string,
    employeeId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    try {
      // Get attendance records for the period - simplified for now
      // const attendanceRecords = await this.attendanceService.getAttendanceHistory(
      //   tenantSlug,
      //   employeeId,
      //   periodStart.toISOString(),
      //   periodEnd.toISOString(),
      // );
      
      // Return simplified calculation for now
      return 168; // Standard monthly working hours
    } catch (error) {
      // If attendance service fails, return 0
      console.error('Failed to calculate regular hours:', error);
      return 0;
    }
  }

  private async calculateOvertimePay(
    tenantSlug: string,
    employeeId: string,
    periodStart: Date,
    periodEnd: Date,
    overtimeRequestIds: string[] = [],
  ): Promise<{ totalHours: number; totalPay: string }> {
    try {
      // Get current salary for overtime rate calculation
      const currentSalary = await this.salaryService.getCurrentSalary(tenantSlug, parseInt(employeeId));
      if (!currentSalary) {
        return { totalHours: 0, totalPay: '0' };
      }

      // Fetch approved overtime requests for the period
      const overtimeRequests = await this.overtimeRequestService.findAll(
        tenantSlug,
        {
          employeeId: parseInt(employeeId),
          status: 'APPROVED',
          startDate: periodStart.toISOString(),
          endDate: periodEnd.toISOString(),
          take: 100, // Get all overtime requests in the period
        },
      );

      if (!overtimeRequests?.requests || overtimeRequests.requests.length === 0) {
        return { totalHours: 0, totalPay: '0' };
      }

      // Calculate total overtime hours and pay
      let totalMinutes = 0;
      let totalPay = new Prisma.Decimal(0);

      for (const overtime of overtimeRequests.requests) {
        // Add minutes from overtime request
        totalMinutes += overtime.totalMinutes || 0;
        
        // Add calculated amount if available
        if (overtime.calculatedAmount) {
          totalPay = totalPay.plus(new Prisma.Decimal(overtime.calculatedAmount));
        }
      }

      const totalHours = totalMinutes / 60;

      return {
        totalHours,
        totalPay: totalPay.toString(),
      };
    } catch (error) {
      console.error('Failed to calculate overtime pay:', error);
      // Return 0 instead of throwing to avoid breaking payroll generation
      return { totalHours: 0, totalPay: '0' };
    }
  }

  private isHoliday(date: Date): boolean {
    // Simplified holiday check - in real implementation, 
    // this should check against a holiday calendar
    const holidays = [
      '2024-01-01', // New Year
      '2024-12-25', // Christmas
      // Add more holidays as needed
    ];
    
    const dateStr = date.toISOString().split('T')[0];
    return holidays.includes(dateStr);
  }

  private transformPayrollToDto(payroll: any): PayrollDto {
    const dto = plainToInstance(PayrollDto, {
      ...payroll,
      id: payroll.id.toString(),
      employeeId: payroll.employeeId.toString(),
      baseSalary: payroll.baseSalary.toString(),
      overtimePay: payroll.overtimePay.toString(),
      deductions: payroll.deductions.toString(),
      bonuses: payroll.bonuses.toString(),
      grossSalary: payroll.grossSalary.toString(),
      netSalary: payroll.netSalary.toString(),
      overtimeHours: payroll.overtimeHours.toString(),
      regularHours: payroll.regularHours.toString(),
      processedBy: payroll.processedBy?.toString(),
      employee: payroll.employee ? {
        id: payroll.employee.id.toString(),
        firstName: payroll.employee.firstName,
        lastName: payroll.employee.lastName,
        position: payroll.employee.position,
        department: payroll.employee.department,
      } : undefined,
      processor: payroll.processor ? {
        id: payroll.processor.id.toString(),
        email: payroll.processor.email,
      } : undefined,
    });

    return dto;
  }
}