import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { LeavePeriodRepository } from '../repositories/leave-period.repository';
import { LeaveTypeRepository } from '../repositories/leave-type.repository';
import { CreateLeavePeriodDto, UpdateLeavePeriodDto } from '../dto/leave-period.dto';
import { LeaveType } from '../dto/leave-type.dto';

@Injectable()
export class LeavePeriodService {
  constructor(
    private repository: LeavePeriodRepository,
    private leaveTypeRepository: LeaveTypeRepository
  ) {}

  async create(tenantSlug: string, createDto: CreateLeavePeriodDto, userId: bigint) {
    const startDate = new Date(createDto.startDate);
    const endDate = new Date(createDto.endDate);

    // Validate dates
    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    // Check for overlapping periods
    const existingPeriods = await this.repository.findAll(tenantSlug, {
      where: {
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate }
          }
        ]
      }
    });

    if (existingPeriods.length > 0) {
      throw new ConflictException('Leave period overlaps with existing period');
    }

    const result =  this.repository.create(tenantSlug, {
      name: createDto.name,
      startDate,
      endDate,
      description: createDto.description,
      createdBy: userId,
    });

    console.log(result);
    return this.transformPeriod(result);
  }

  async findAll(tenantSlug: string, params?: {
    page?: number;
    limit?: number;
    activeOnly?: boolean;
  }) {
    const { page = 1, limit = 10, activeOnly = false } = params || {};
    const skip = (page - 1) * limit;

    const where = activeOnly ? { isActive: true } : undefined;

    const [periods, total] = await Promise.all([
      this.repository.findAll(tenantSlug, {
        skip,
        take: limit,
        where,
        orderBy: { startDate: 'desc' }
      }),
      this.repository.count(tenantSlug, where)
    ]);

    return {
      data: periods.map((period: any) => this.transformPeriod(period)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(tenantSlug: string, id: bigint) {
    const period = await this.repository.findById(tenantSlug, id);
    if (!period) {
      throw new NotFoundException('Leave period not found');
    }
    return this.transformPeriod(period);
  }

  async findActive(tenantSlug: string) {
    const period = await this.repository.findActive(tenantSlug);
    if (!period) {
      throw new NotFoundException('No active leave period found');
    }
    return this.transformPeriod(period);
  }

  async update(tenantSlug: string, id: bigint, updateDto: UpdateLeavePeriodDto) {
    const existingPeriod = await this.repository.findById(tenantSlug, id);
    if (!existingPeriod) {
      throw new NotFoundException('Leave period not found');
    }

    const updateData: any = {};
    
    if (updateDto.name) updateData.name = updateDto.name;
    if (updateDto.description !== undefined) updateData.description = updateDto.description;
    if (updateDto.isActive !== undefined) updateData.isActive = updateDto.isActive;
    
    if (updateDto.startDate || updateDto.endDate) {
      const startDate = updateDto.startDate ? new Date(updateDto.startDate) : existingPeriod.startDate;
      const endDate = updateDto.endDate ? new Date(updateDto.endDate) : existingPeriod.endDate;

      if (startDate >= endDate) {
        throw new BadRequestException('Start date must be before end date');
      }

      updateData.startDate = startDate;
      updateData.endDate = endDate;
    }

    const updatedPeriod = await this.repository.update(tenantSlug, id, updateData);
    return this.transformPeriod(updatedPeriod);
  }

  async delete(tenantSlug: string, id: bigint) {
    const period = await this.repository.findById(tenantSlug, id);
    if (!period) {
      throw new NotFoundException('Leave period not found');
    }

    // Check if period has any leave balances or requests
    if (period.leaveBalances.length > 0) {
      throw new BadRequestException('Cannot delete period with existing leave balances');
    }

    await this.repository.delete(tenantSlug, id);
    return { message: 'Leave period deleted successfully' };
  }

  private transformPeriod(period: any) {
    return {
      id: Number(period.id),
      name: period.name,
      startDate: period.startDate instanceof Date 
        ? period.startDate.toISOString().split('T')[0]
        : (typeof period.startDate === 'string' ? period.startDate.split('T')[0] : period.startDate),
      endDate: period.endDate instanceof Date
        ? period.endDate.toISOString().split('T')[0]
        : (typeof period.endDate === 'string' ? period.endDate.split('T')[0] : period.endDate),
      isActive: period.isActive,
      description: period.description,
      createdBy: Number(period.createdBy),
      createdAt: period.createdAt ? (period.createdAt instanceof Date 
        ? period.createdAt.toISOString() 
        : new Date(period.createdAt).toISOString()) : new Date().toISOString(),
      updatedAt: period.updatedAt ? (period.updatedAt instanceof Date
        ? period.updatedAt.toISOString()
        : new Date(period.updatedAt).toISOString()) : new Date().toISOString(),
      leaveTypes: period.leaveTypes?.map((lt: any) => ({
        id: Number(lt.id),
        type: lt.type,
        name: lt.name,
        defaultQuota: lt.defaultQuota,
        isActive: lt.isActive
      })) || [],
      stats: {
        totalEmployeesWithBalances: period._count?.leaveBalances || 0,
        totalLeaveRequests: period._count?.leaveRequests || 0
      }
    };
  }

  async setupDefaultLeaveTypes(tenantSlug: string, periodId: number): Promise<{ message: string, count: number }> {
    // Check if period exists
    const period = await this.repository.findById(tenantSlug, BigInt(periodId));
    if (!period) {
      throw new NotFoundException(`Leave period with ID ${periodId} not found`);
    }

    // Default configurations for each leave type
    const defaultConfigs = [
      {
        type: LeaveType.ANNUAL,
        name: 'Annual Leave',
        description: 'Yearly vacation leave entitlement',
        defaultQuota: 12,
        maxConsecutiveDays: 14,
        advanceNoticeDays: 3,
        isCarryForward: true,
        maxCarryForward: 6,
        isActive: true
      },
      {
        type: LeaveType.SICK,
        name: 'Sick Leave',
        description: 'Medical leave for illness or injury',
        defaultQuota: 12,
        maxConsecutiveDays: 7,
        advanceNoticeDays: 0,
        isCarryForward: false,
        maxCarryForward: 0,
        isActive: true
      },
      {
        type: LeaveType.EMERGENCY,
        name: 'Emergency Leave',
        description: 'Urgent family or personal emergency leave',
        defaultQuota: 2,
        maxConsecutiveDays: 2,
        advanceNoticeDays: 0,
        isCarryForward: false,
        maxCarryForward: 0,
        isActive: true
      },
      {
        type: LeaveType.MATERNITY,
        name: 'Maternity Leave',
        description: 'Maternity leave for mothers',
        defaultQuota: 90,
        maxConsecutiveDays: 90,
        advanceNoticeDays: 30,
        isCarryForward: false,
        maxCarryForward: 0,
        isActive: true
      },
      {
        type: LeaveType.PATERNITY,
        name: 'Paternity Leave',
        description: 'Paternity leave for fathers',
        defaultQuota: 14,
        maxConsecutiveDays: 14,
        advanceNoticeDays: 14,
        isCarryForward: false,
        maxCarryForward: 0,
        isActive: true
      }
    ];

    let createdCount = 0;
    
    for (const config of defaultConfigs) {
      // Check if this type already exists for this period
      const existing = await this.leaveTypeRepository.findByTypeAndPeriod(tenantSlug, config.type, BigInt(periodId));
      
      if (!existing) {
        const createData = {
          ...config,
          leavePeriod: {
            connect: { id: BigInt(periodId) }
          }
        };
        
        await this.leaveTypeRepository.create(tenantSlug, createData);
        createdCount++;
      }
    }

    return {
      message: `Default leave type configurations setup completed`,
      count: createdCount
    };
  }
}