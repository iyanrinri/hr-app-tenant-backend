import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SalaryRepository } from '../repositories/salary.repository';
import { SalaryHistoryRepository } from '../repositories/salary-history.repository';
import { CreateSalaryDto } from '../dto/create-salary.dto';
import { UpdateSalaryDto } from '../dto/update-salary.dto';
import { CreateSalaryHistoryDto, SalaryChangeType } from '../dto/create-salary-history.dto';
import { SalaryResponseDto, SalaryHistoryResponseDto } from '../dto/salary-response.dto';
import { Role } from '@prisma/client';

@Injectable()
export class SalaryService {
  constructor(
    private salaryRepository: SalaryRepository,
    private salaryHistoryRepository: SalaryHistoryRepository,
  ) {}

  private transformSalaryResponse(salary: any): SalaryResponseDto {
    return {
      ...salary,
      id: salary.id.toString(),
      employeeId: salary.employeeId.toString(),
      baseSalary: salary.baseSalary.toString(),
      allowances: salary.allowances.toString(),
      createdBy: salary.createdBy.toString(),
      employee: salary.employee ? {
        id: salary.employee.id.toString(),
        firstName: salary.employee.firstName,
        lastName: salary.employee.lastName,
        position: salary.employee.position,
        department: salary.employee.department,
      } : undefined,
    };
  }

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

  async create(tenantSlug: string, createSalaryDto: CreateSalaryDto): Promise<SalaryResponseDto> {
    const { employeeId, effectiveDate, endDate, createdBy, ...salaryData } = createSalaryDto;

    // Check if there's an active salary that needs to be ended
    const currentSalary = await this.salaryRepository.findCurrentSalary(tenantSlug, BigInt(employeeId));
    
    if (currentSalary) {
      // End the current salary one day before the new effective date
      const endCurrentDate = new Date(effectiveDate);
      endCurrentDate.setDate(endCurrentDate.getDate() - 1);
      
      await this.salaryRepository.endCurrentSalary(tenantSlug, BigInt(employeeId), endCurrentDate);
    }

    // Create new salary record
    const salary = await this.salaryRepository.create(tenantSlug, {
      ...salaryData,
      employee: {
        connect: { id: BigInt(employeeId) }
      },
      effectiveDate: new Date(effectiveDate),
      endDate: endDate ? new Date(endDate) : null,
      createdBy: BigInt(createdBy),
    });

    // Create salary history record
    await this.salaryHistoryRepository.create(tenantSlug,{
      employee: {
        connect: { id: BigInt(employeeId) }
      },
      changeType: currentSalary ? SalaryChangeType.GRADE_ADJUSTMENT : SalaryChangeType.INITIAL,
      oldBaseSalary: currentSalary?.baseSalary,
      newBaseSalary: salaryData.baseSalary,
      reason: currentSalary ? 'Salary adjustment' : 'Initial salary setup',
      effectiveDate: new Date(effectiveDate),
      approvedBy: BigInt(createdBy),
    });

    const createdSalary = await this.salaryRepository.findUnique(
      tenantSlug,
      { id: salary.id },
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

    return this.transformSalaryResponse(createdSalary);
  }

  async findAll(tenantSlug: string, params: {
    skip?: number;
    take?: number;
    employeeId?: number;
    isActive?: boolean;
    grade?: string;
  } = {}): Promise<{ salaries: SalaryResponseDto[]; total: number }> {
    const { skip = 0, take = 10, employeeId, isActive, grade } = params;

    const where: any = {};
    if (employeeId) where.employeeId = BigInt(employeeId);
    if (isActive !== undefined) where.isActive = isActive;
    if (grade) where.grade = { contains: grade, mode: 'insensitive' };

    const [salaries, total] = await Promise.all([
      this.salaryRepository.findAll(
        tenantSlug, {
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
      this.salaryRepository.count(where)
    ]);

    return {
      salaries: salaries.map(salary => this.transformSalaryResponse(salary)),
      total
    };
  }

  async findOne(tenantSlug: string, id: number): Promise<SalaryResponseDto> {
    const salary = await this.salaryRepository.findUnique(
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

    if (!salary) {
      throw new NotFoundException(`Salary with ID ${id} not found`);
    }

    return this.transformSalaryResponse(salary);
  }

  async getCurrentSalary(tenantSlug: string, employeeId: number): Promise<SalaryResponseDto> {
    const salary = await this.salaryRepository.findCurrentSalary(tenantSlug, BigInt(employeeId));

    if (!salary) {
      throw new NotFoundException(`No active salary found for employee ${employeeId}`);
    }

    return this.transformSalaryResponse(salary);
  }

  async getEmployeeSalaryHistory(tenantSlug: string, employeeId: number): Promise<SalaryResponseDto[]> {
    const salaries = await this.salaryRepository.findEmployeeSalaryHistory(tenantSlug, BigInt(employeeId));
    return salaries.map(salary => this.transformSalaryResponse(salary));
  }

  async update(tenantSlug: string, id: number, updateSalaryDto: UpdateSalaryDto): Promise<SalaryResponseDto> {
    const existingSalary = await this.salaryRepository.findUnique(tenantSlug, { id: BigInt(id) });
    
    if (!existingSalary) {
      throw new NotFoundException(`Salary with ID ${id} not found`);
    }

    const { endDate, ...updateData } = updateSalaryDto;

    const updatedSalary = await this.salaryRepository.update(
      tenantSlug,
      { id: BigInt(id) },
      {
        ...updateData,
        endDate: endDate ? new Date(endDate) : undefined,
      }
    );

    const result = await this.salaryRepository.findUnique(
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

    return this.transformSalaryResponse(result);
  }

  async remove(tenantSlug: string, id: number): Promise<void> {
    const salary = await this.salaryRepository.findUnique(tenantSlug, { id: BigInt(id) });
    
    if (!salary) {
      throw new NotFoundException(`Salary with ID ${id} not found`);
    }

    await this.salaryRepository.delete(tenantSlug, { id: BigInt(id) });
  }
}
