import { Injectable } from '@nestjs/common';
import { MultiTenantPrismaService } from '../../../database/multi-tenant-prisma.service';

@Injectable()
export class OvertimeApprovalRepository {
  constructor(private prisma: MultiTenantPrismaService) {}

  async create(tenantSlug: string, data: any) {
    return this.prisma.getClient(tenantSlug).overtimeApproval.create({ data });
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
    
    return this.prisma.getClient(tenantSlug).overtimeApproval.findMany({
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
    return this.prisma.getClient(tenantSlug).overtimeApproval.findUnique({
      where,
      include,
    });
  }

  async findByRequest(tenantSlug: string, overtimeRequestId: bigint): Promise<any[]> {
    return this.prisma.getClient(tenantSlug).overtimeApproval.findMany({
      where: { overtimeRequestId },
      include: {
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true,
            department: true
          }
        },
        overtimeRequest: {
          select: {
            id: true,
            employeeId: true,
            date: true,
            reason: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async findByApprover(
    tenantSlug: string,
    approverId: bigint,
    params?: {
      skip?: number;
      take?: number;
      status?: string;
      approverType?: string;
    }
  ): Promise<any[]> {
    const { skip = 0, take = 20, status, approverType } = params || {};

    const where: any = {
      approverId,
    };

    if (status) {
      where.status = status as any;
    }

    if (approverType) {
      where.approverType = approverType;
    }

    return this.prisma.getClient(tenantSlug).overtimeApproval.findMany({
      skip,
      take,
      where,
      include: {
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true,
            department: true
          }
        },
        overtimeRequest: {
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
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findPendingApprovals(
    tenantSlug: string,
    approverId?: bigint,
    approverType?: string
  ): Promise<any[]> {
    const where: any = {
      status: 'PENDING'
    };

    if (approverId) {
      where.approverId = approverId;
    }

    if (approverType) {
      where.approverType = approverType;
    }

    return this.prisma.getClient(tenantSlug).overtimeApproval.findMany({
      where,
      include: {
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true,
            department: true
          }
        },
        overtimeRequest: {
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
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async findExisting(
    tenantSlug: string,
    overtimeRequestId: bigint,
    approverId: bigint,
    approverType: string
  ): Promise<any | null> {
    return this.prisma.getClient(tenantSlug).overtimeApproval.findUnique({
      where: {
        overtimeRequestId_approverId_approverType: {
          overtimeRequestId,
          approverId,
          approverType
        }
      }
    });
  }

  async update(
    tenantSlug: string,
    where: any,
    data: any
  ): Promise<any> {
    return this.prisma.getClient(tenantSlug).overtimeApproval.update({
      where,
      data,
    });
  }

  async delete(
    tenantSlug: string, where: any): Promise<any> {
    return this.prisma.getClient(tenantSlug).overtimeApproval.delete({ where });
  }

  async count(tenantSlug: string, where?: any): Promise<number> {
    return this.prisma.getClient(tenantSlug).overtimeApproval.count({ where });
  }

  async getApprovalStats(tenantSlug: string, approverId?: bigint, startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (approverId) {
      where.approverId = approverId;
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate
      };
    }

    const stats = await this.prisma.getClient(tenantSlug).overtimeApproval.groupBy({
      by: ['status'],
      where,
      _count: {
        status: true
      }
    });

    return stats.reduce((acc: Record<string, number>, curr: { status: string; _count: { status: number } }) => {
      acc[curr.status] = curr._count.status;
      return acc;
    }, {} as Record<string, number>);
  }
}
