import { Injectable } from '@nestjs/common';
import { MultiTenantPrismaService } from '../../../database/multi-tenant-prisma.service';
@Injectable()
export class OvertimeRequestRepository {
  constructor(private prisma: MultiTenantPrismaService) {}

  async create(tenantSlug: string, data: any): Promise<any> {
    return this.prisma.getClient(tenantSlug).overtimeRequest.create({ data });
  }

  async findAll(tenantSlug: string, params: {
    skip?: number;
    take?: number;
    cursor?: any;
    where?: any;
    orderBy?: any;
    include?: any;
  }): Promise<any[]> {
    const { skip, take, cursor, where, orderBy, include } = params;
    
    return this.prisma.getClient(tenantSlug).overtimeRequest.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include,
    });
  }

  async findUnique(
    tenantSlug: string,
    where: any,
    include?: any
  ): Promise<any | null> {
    return this.prisma.getClient(tenantSlug).overtimeRequest.findUnique({
      where,
      include,
    });
  }

  async findByEmployee(
    tenantSlug: string,
    employeeId: bigint, params?: {
    skip?: number;
    take?: number;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any[]> {
    const { skip = 0, take = 20, status, startDate, endDate } = params || {};

    const where: any = {
      employeeId,
    };

    if (status) {
      where.status = status as any;
    }

    if (startDate && endDate) {
      where.date = {
        gte: startDate,
        lte: endDate
      };
    }

    return this.prisma.getClient(tenantSlug).overtimeRequest.findMany({
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
        },
        attendance: {
          select: {
            id: true,
            date: true,
            checkIn: true,
            checkOut: true,
            workDuration: true
          }
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                position: true,
                department: true
              }
            }
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });
  }

  async findPendingRequests(
    tenantSlug: string,
    params?: {
    skip?: number;
    take?: number;
    managerId?: bigint;
  }): Promise<any[]> {
    const { skip = 0, take = 20, managerId } = params || {};

    const where: any = {
      status: {
        in: ['PENDING', 'MANAGER_APPROVED']
      }
    };

    if (managerId) {
      where.employee = {
        managerId
      };
    }

    return this.prisma.getClient(tenantSlug).overtimeRequest.findMany({
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
            department: true,
            managerId: true
          }
        },
        attendance: {
          select: {
            id: true,
            date: true,
            checkIn: true,
            checkOut: true,
            workDuration: true
          }
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                position: true,
                department: true
              }
            }
          }
        }
      },
      orderBy: { submittedAt: 'asc' }
    });
  }

  async findByDateRange(
    tenantSlug: string,
    startDate: Date,
    endDate: Date,
    employeeId?: bigint
  ): Promise<any[]> {
    const where: any = {
      date: {
        gte: startDate,
        lte: endDate
      }
    };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    return this.prisma.getClient(tenantSlug).overtimeRequest.findMany({
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
        },
        attendance: {
          select: {
            id: true,
            date: true,
            checkIn: true,
            checkOut: true,
            workDuration: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });
  }

  async checkExistingRequest(
    tenantSlug: string,
    employeeId: bigint,
    date: Date
  ): Promise<any | null> {
    return this.prisma.getClient(tenantSlug).overtimeRequest.findFirst({
      where: {
        employeeId,
        date,
        status: {
          notIn: ['REJECTED', 'CANCELLED']
        }
      }
    });
  }

  async findAttendanceByDate(
    tenantSlug: string,
    employeeId: bigint,
    date: Date
  ): Promise<{ id: bigint } | null> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.getClient(tenantSlug).attendance.findFirst({
      where: {
        employeeId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      select: {
        id: true
      }
    });
  }

  async update(
    tenantSlug: string,
    where: any,
    data: any
  ): Promise<any> {
    return this.prisma.getClient(tenantSlug).overtimeRequest.update({
      where,
      data,
    });
  }

  async delete(
    tenantSlug: string, where: any): Promise<any> {
    return this.prisma.getClient(tenantSlug).overtimeRequest.delete({ where });
  }

  async count(
    tenantSlug: string,
    where?: any): Promise<number> {
    return this.prisma.getClient(tenantSlug).overtimeRequest.count({ where });
  }

  async getTotalOvertimeMinutes(
    tenantSlug: string,
    employeeId: bigint,
    startDate: Date,
    endDate: Date,
    status?: string
  ): Promise<number> {
    const where: any = {
      employeeId,
      date: {
        gte: startDate,
        lte: endDate
      }
    };

    if (status) {
      where.status = status as any;
    }

    const result = await this.prisma.getClient(tenantSlug).overtimeRequest.aggregate({
      where,
      _sum: {
        totalMinutes: true
      }
    });

    return result._sum.totalMinutes || 0;
  }

  async getEmployeeIdByUserId(tenantSlug: string, userId: bigint): Promise<bigint | null> {
    const employee = await this.prisma.getClient(tenantSlug).employee.findFirst({
      where: { userId },
      select: { id: true }
    });
    return employee?.id || null;
  }
}
