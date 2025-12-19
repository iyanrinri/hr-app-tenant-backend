import { Injectable, NotFoundException } from '@nestjs/common';
import { LeaveBalanceRepository } from '../repositories/leave-balance.repository';
import { LeavePeriodRepository } from '../repositories/leave-period.repository';
import { LeaveBalanceResponseDto, LeaveBalanceSummaryDto } from '../dto/leave-request.dto';

@Injectable()
export class LeaveBalanceService {
  constructor(
    private readonly leaveBalanceRepository: LeaveBalanceRepository,
    private readonly leavePeriodRepository: LeavePeriodRepository
  ) {}

  async getEmployeeBalances(
    tenantSlug: string,
    employeeId: number,
    periodId?: number
  ): Promise<LeaveBalanceResponseDto[]> {
    let targetPeriodId: bigint;

    if (periodId) {
      // Use specified period
      targetPeriodId = BigInt(periodId);
      const period = await this.leavePeriodRepository.findById(tenantSlug, targetPeriodId);
      if (!period) {
        throw new NotFoundException(`Leave period with ID ${periodId} not found`);
      }
    } else {
      // Get active period
      const activePeriod = await this.leaveBalanceRepository.findActivePeriod(tenantSlug);
      if (!activePeriod) {
        throw new NotFoundException('No active leave period found');
      }
      targetPeriodId = activePeriod.id;
    }

    const balances = await this.leaveBalanceRepository.findByEmployee(
      tenantSlug,
      BigInt(employeeId),
      targetPeriodId
    );

    return balances.map((balance: any) => this.mapToResponseDto(balance));
  }

  async getEmployeeBalanceSummary(
    tenantSlug: string,
    employeeId: number,
    periodId?: number
  ): Promise<LeaveBalanceSummaryDto> {
    const balances = await this.getEmployeeBalances(tenantSlug, employeeId, periodId);

    const totalQuota = balances.reduce((sum, balance) => sum + balance.totalQuota, 0);
    const totalUsed = balances.reduce((sum, balance) => sum + balance.usedQuota, 0);
    const totalRemaining = balances.reduce((sum, balance) => sum + balance.remainingQuota, 0);

    return {
      employeeId: employeeId.toString(),
      employeeName: 'Employee Name', // You might want to fetch this from employee service
      balances,
      totalQuota,
      totalUsed,
      totalRemaining
    };
  }

  async getEmployeeBalanceByType(
    tenantSlug: string,
    employeeId: number,
    leaveTypeConfigId: number
  ): Promise<LeaveBalanceResponseDto | null> {
    const balance = await this.leaveBalanceRepository.findByEmployeeAndType(
      tenantSlug,
      BigInt(employeeId),
      BigInt(leaveTypeConfigId)
    );

    return balance ? this.mapToResponseDto(balance) : null;
  }

  async updateBalance(
    tenantSlug: string,
    employeeId: number,
    periodId: number,
    leaveTypeConfigId: number,
    usedDays: number
  ): Promise<LeaveBalanceResponseDto> {
    const balance = await this.leaveBalanceRepository.updateQuotas(
      tenantSlug,
      BigInt(employeeId),
      BigInt(periodId),
      BigInt(leaveTypeConfigId),
      usedDays
    );

    return this.mapToResponseDto(balance);
  }

  async initializeEmployeeBalance(
    tenantSlug: string,
    employeeId: number,
    leaveTypeConfigId: number,
    customQuota?: number
  ): Promise<LeaveBalanceResponseDto> {
    const balance = await this.leaveBalanceRepository.initializeBalance(
      tenantSlug,
      BigInt(employeeId),
      BigInt(leaveTypeConfigId),
      customQuota
    );

    return this.mapToResponseDto(balance);
  }

  private mapToResponseDto(balance: any): LeaveBalanceResponseDto {
    return {
      id: balance.id.toString(),
      leaveTypeName: balance.leaveTypeConfig?.name || 'Unknown',
      totalQuota: balance.totalQuota,
      usedQuota: balance.usedQuota,
      remainingQuota: balance.totalQuota - balance.usedQuota,
      validFrom: balance.leavePeriod?.startDate?.toISOString()?.split('T')[0] || '',
      validTo: balance.leavePeriod?.endDate?.toISOString()?.split('T')[0] || '',
      isActive: balance.leavePeriod?.isActive || false
    };
  }
}