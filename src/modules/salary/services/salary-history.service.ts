import { Injectable, NotFoundException } from '@nestjs/common';
import { SalaryHistoryRepository } from '../repositories/salary-history.repository';
import { CreateSalaryHistoryDto } from '../dto/create-salary-history.dto';
import { SalaryHistoryResponseDto } from '../dto/salary-response.dto';

@Injectable()
export class SalaryHistoryService {
  constructor(
    private salaryHistoryRepository: SalaryHistoryRepository,
  ) {}

  private transformSalaryHistoryResponse(salaryHistory: any): SalaryHistoryResponseDto {
    return {
      ...salaryHistory,
      id: salaryHistory.id.toString(),
      employeeId: salaryHistory.employeeId.toString(),
      oldBaseSalary: salaryHistory.oldBaseSalary?.toString(),
      newBaseSalary: salaryHistory.newBaseSalary.toString(),
      approvedBy: salaryHistory.approvedBy?.toString(),
      employee: salaryHistory.employee ? {
        id: salaryHistory.employee.id.toString(),
        firstName: salaryHistory.employee.firstName,
        lastName: salaryHistory.employee.lastName,
        position: salaryHistory.employee.position,
        department: salaryHistory.employee.department,
      } : undefined,
    };
  }

  async create(tenantSlug: string, createSalaryHistoryDto: CreateSalaryHistoryDto): Promise<SalaryHistoryResponseDto> {
    const { employeeId, effectiveDate, approvedBy, ...historyData } = createSalaryHistoryDto;

    const salaryHistory = await this.salaryHistoryRepository.create(tenantSlug, {
      ...historyData,
      employee: {
        connect: { id: BigInt(employeeId) }
      },
      effectiveDate: new Date(effectiveDate),
      approvedBy: approvedBy ? BigInt(approvedBy) : null,
    });

    const createdHistory = await this.salaryHistoryRepository.findUnique(
      tenantSlug,
      { id: salaryHistory.id },
      {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true,
            department: true
          }
        }
      }
    );

    return this.transformSalaryHistoryResponse(createdHistory);
  }

  async findAll(tenantSlug: string, params: {
    skip?: number;
    take?: number;
    employeeId?: number;
    changeType?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<{ histories: SalaryHistoryResponseDto[]; total: number }> {
    const { skip = 0, take = 20, employeeId, changeType, startDate, endDate } = params;

    const where: any = {};
    if (employeeId) where.employeeId = BigInt(employeeId);
    if (changeType) where.changeType = changeType;
    if (startDate && endDate) {
      where.effectiveDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const [histories, total] = await Promise.all([
      this.salaryHistoryRepository.findAll(tenantSlug, {
        skip,
        take,
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              position: true,
              department: true
            }
          }
        },
        orderBy: { effectiveDate: 'desc' }
      }),
      this.salaryHistoryRepository.count(where)
    ]);

    return {
      histories: histories.map(history => this.transformSalaryHistoryResponse(history)),
      total
    };
  }

  async findOne(tenantSlug: string, id: number): Promise<SalaryHistoryResponseDto> {
    const salaryHistory = await this.salaryHistoryRepository.findUnique(
      tenantSlug,
      { id: BigInt(id) },
      {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true,
            department: true
          }
        }
      }
    );

    if (!salaryHistory) {
      throw new NotFoundException(`Salary history with ID ${id} not found`);
    }

    return this.transformSalaryHistoryResponse(salaryHistory);
  }

  async getEmployeeHistory(tenantSlug: string, employeeId: number): Promise<SalaryHistoryResponseDto[]> {
    const histories = await this.salaryHistoryRepository.findEmployeeHistory(tenantSlug, BigInt(employeeId));
    return histories.map(history => this.transformSalaryHistoryResponse(history));
  }

  async getByDateRange(
    tenantSlug: string,
    employeeId: number,
    startDate: string,
    endDate: string
  ): Promise<SalaryHistoryResponseDto[]> {
    const histories = await this.salaryHistoryRepository.findByDateRange(
      tenantSlug,
      BigInt(employeeId),
      new Date(startDate),
      new Date(endDate)
    );
    return histories.map(history => this.transformSalaryHistoryResponse(history));
  }

  async getByChangeType(tenantSlug: string, changeType: string): Promise<SalaryHistoryResponseDto[]> {
    const histories = await this.salaryHistoryRepository.findByChangeType(tenantSlug, changeType);
    return histories.map(history => this.transformSalaryHistoryResponse(history));
  }
}
