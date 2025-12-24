import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PayslipService } from '../services/payslip.service';
import { GeneratePayslipDto } from '../dto/generate-payslip.dto';
import { PayslipResponseDto } from '../dto/payslip-response.dto';
import { JwtAuthGuard } from '@/common/guards';
import { RolesGuard } from '@/common/guards';
import { Roles } from '../../../common/decorators/roles.decorator';
import { plainToInstance } from 'class-transformer';
import { PayslipRepository } from '../repositories/payslip.repository';

@ApiTags('Payslip')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller(':tenant_slug/payslip')
export class PayslipController {
  constructor(
    private readonly payslipService: PayslipService,
    private readonly payslipRepository: PayslipRepository,
  ) {}

  @Post('generate')
  @Roles('SUPER', 'ADMIN', 'HR')
  @ApiOperation({
    summary: 'Generate payslip from payroll',
    description:
      'Calculate PPh 21 tax and BPJS deductions, then generate payslip',
  })
  async generatePayslip(
    @Param('tenant_slug') tenantSlug: string,
    @Body() dto: GeneratePayslipDto, @Request() req: any) {
    const payslip = await this.payslipService.generatePayslip(
      tenantSlug,
      dto,
      BigInt(req.user.id),
    );
    return this.transformPayslip(payslip);
  }

  @Get(':id')
  @Roles('SUPER', 'ADMIN',  'HR', 'MANAGER', 'EMPLOYEE')
  @ApiOperation({ summary: 'Get payslip by ID' })
  async getPayslipById(
    @Param('tenant_slug') tenantSlug: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const payslip = await this.payslipService.getPayslipById(tenantSlug, BigInt(id));
    return this.transformPayslip(payslip);
  }

  @Get('by-payroll/:payrollId')
  @Roles('SUPER', 'ADMIN',  'HR', 'MANAGER', 'EMPLOYEE')
  @ApiOperation({ summary: 'Get payslip by payroll ID' })
  async getPayslipByPayrollId(
    @Param('tenant_slug') tenantSlug: string,
    @Param('payrollId', ParseIntPipe) payrollId: number,
  ) {
    const payslip = await this.payslipService.getPayslipByPayrollId(
      tenantSlug,
      BigInt(payrollId),
    );
    return this.transformPayslip(payslip);
  }

  @Get('employee/:employeeId')
  @Roles('SUPER', 'ADMIN',  'HR', 'MANAGER')
  @ApiOperation({ summary: 'Get employee payslips history' })
  async getEmployeePayslips(
    @Param('tenant_slug') tenantSlug: string,
    @Param('employeeId', ParseIntPipe) employeeId: number,
  ) {
    const payslips = await this.payslipService.getEmployeePayslips(
      tenantSlug,
      BigInt(employeeId),
    );
    return payslips.map((p: any) => this.transformPayslip(p));
  }

  @Get('my/history')
  @Roles('EMPLOYEE')
  @ApiOperation({ summary: 'Get my payslips (self-service for employees)' })
  async getMyPayslips(
    @Param('tenant_slug') tenantSlug: string, @Request() req: any) {
    // Validate user ID exists
    if (!req.user?.id) {
      throw new NotFoundException('User ID not found in token');
    }

    // Get employee ID from user
    const employee = await this.payslipRepository.getEmployeeIdByUserId(
      tenantSlug,
      BigInt(req.user.id),
    );

    if (!employee || !employee.id) {
      throw new NotFoundException('Employee profile not found');
    }

    const payslips = await this.payslipService.getEmployeePayslips(
      tenantSlug, 
      BigInt(employee.id)
    );
    return payslips.map((p: any) => this.transformPayslip(p));
  }

  @Delete(':id')
  @Roles('SUPER', 'ADMIN',  'HR')
  @ApiOperation({
    summary: 'Delete payslip (for corrections)',
    description: 'Admin only - delete payslip if corrections are needed',
  })
  async deletePayslip(
    @Param('tenant_slug') tenantSlug: string,
    @Param('id', ParseIntPipe) id: number) {
    await this.payslipService.deletePayslip(tenantSlug, BigInt(id));
    return {
      message: 'Payslip deleted successfully',
    };
  }

  /**
   * Transform payslip data for response (convert BigInt to string)
   */
  private transformPayslip(payslip: any): PayslipResponseDto {
    const transformed = {
      ...payslip,
      id: payslip.id.toString(),
      payrollId: payslip.payrollId.toString(),
      grossSalary: payslip.grossSalary.toString(),
      overtimePay: payslip.overtimePay.toString(),
      bonuses: payslip.bonuses.toString(),
      allowances: payslip.allowances.toString(),
      taxAmount: payslip.taxAmount.toString(),
      bpjsKesehatanEmployee: payslip.bpjsKesehatanEmployee.toString(),
      bpjsKesehatanCompany: payslip.bpjsKesehatanCompany.toString(),
      bpjsKetenagakerjaanEmployee:
        payslip.bpjsKetenagakerjaanEmployee.toString(),
      bpjsKetenagakerjaanCompany:
        payslip.bpjsKetenagakerjaanCompany.toString(),
      otherDeductions: payslip.otherDeductions.toString(),
      takeHomePay: payslip.takeHomePay.toString(),
      generatedBy: payslip.generatedBy.toString(),
      generatedAt: payslip.generatedAt.toISOString(),
      createdAt: payslip.createdAt.toISOString(),
      updatedAt: payslip.updatedAt.toISOString(),
      payroll: payslip.payroll ? {
        id: payslip.payroll.id.toString(),
        periodStart: payslip.payroll.periodStart?.toISOString() || payslip.payroll.periodStart,
        periodEnd: payslip.payroll.periodEnd?.toISOString() || payslip.payroll.periodEnd,
        baseSalary: payslip.payroll.baseSalary.toString(),
        overtimePay: payslip.payroll.overtimePay.toString(),
        bonuses: payslip.payroll.bonuses.toString(),
        isPaid: payslip.payroll.isPaid,
        paidAt: payslip.payroll.paidAt?.toISOString() || payslip.payroll.paidAt,
        processedAt: payslip.payroll.processedAt?.toISOString() || payslip.payroll.processedAt,
        employee: payslip.payroll.employee ? {
          id: payslip.payroll.employee.id.toString(),
          firstName: payslip.payroll.employee.firstName,
          lastName: payslip.payroll.employee.lastName,
          position: payslip.payroll.employee.position,
          department: payslip.payroll.employee.department,
          employeeNumber: payslip.payroll.employee.employeeNumber,
          maritalStatus: payslip.payroll.employee.maritalStatus,
        } : undefined,
      } : undefined,
      deductions: payslip.deductions?.map((d: any) => ({
        id: d.id.toString(),
        type: d.type,
        description: d.description,
        amount: d.amount.toString(),
      })),
    };

    return plainToInstance(PayslipResponseDto, transformed, {
      excludeExtraneousValues: true,
    });
  }
}

