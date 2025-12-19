import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { OvertimeRequestRepository } from '../repositories/overtime-request.repository';
import { OvertimeApprovalRepository } from '../repositories/overtime-approval.repository';
import { CreateOvertimeRequestDto } from '../dto/create-overtime-request.dto';
import { UpdateOvertimeRequestDto, OvertimeStatus } from '../dto/update-overtime-request.dto';
import { OvertimeRequestResponseDto, PaginatedOvertimeResponseDto } from '../dto/overtime-response.dto';
import { ApprovalStatus, ApproverType } from '../dto/overtime-approval.dto';
import { Role } from '@prisma/client';

@Injectable()
export class OvertimeRequestService {
  constructor(
    private overtimeRequestRepository: OvertimeRequestRepository,
    private overtimeApprovalRepository: OvertimeApprovalRepository,
  ) {}

  private transformOvertimeResponse(overtime: any): OvertimeRequestResponseDto {
    return {
      ...overtime,
      id: overtime.id.toString(),
      employeeId: overtime.employeeId.toString(),
      attendanceId: overtime.attendanceId?.toString(),
      overtimeRate: overtime.overtimeRate?.toString(),
      calculatedAmount: overtime.calculatedAmount?.toString(),
      date: overtime.date instanceof Date ? overtime.date.toISOString() : overtime.date,
      startTime: overtime.startTime instanceof Date ? overtime.startTime.toISOString() : overtime.startTime,
      endTime: overtime.endTime instanceof Date ? overtime.endTime.toISOString() : overtime.endTime,
      submittedAt: overtime.submittedAt instanceof Date ? overtime.submittedAt.toISOString() : overtime.submittedAt,
      managerApprovedAt: overtime.managerApprovedAt instanceof Date ? overtime.managerApprovedAt.toISOString() : overtime.managerApprovedAt,
      hrApprovedAt: overtime.hrApprovedAt instanceof Date ? overtime.hrApprovedAt.toISOString() : overtime.hrApprovedAt,
      finalizedAt: overtime.finalizedAt instanceof Date ? overtime.finalizedAt.toISOString() : overtime.finalizedAt,
      createdAt: overtime.createdAt instanceof Date ? overtime.createdAt.toISOString() : overtime.createdAt,
      updatedAt: overtime.updatedAt instanceof Date ? overtime.updatedAt.toISOString() : overtime.updatedAt,
      employee: overtime.employee ? {
        id: overtime.employee.id.toString(),
        firstName: overtime.employee.firstName,
        lastName: overtime.employee.lastName,
        position: overtime.employee.position,
        department: overtime.employee.department,
      } : undefined,
      attendance: overtime.attendance ? {
        id: overtime.attendance.id.toString(),
        date: overtime.attendance.date instanceof Date ? overtime.attendance.date.toISOString() : overtime.attendance.date,
        checkIn: overtime.attendance.checkIn instanceof Date ? overtime.attendance.checkIn.toISOString() : overtime.attendance.checkIn,
        checkOut: overtime.attendance.checkOut instanceof Date ? overtime.attendance.checkOut.toISOString() : overtime.attendance.checkOut,
        workDuration: overtime.attendance.workDuration,
      } : undefined,
      approvals: overtime.approvals?.map((approval: any) => ({
        id: approval.id.toString(),
        overtimeRequestId: approval.overtimeRequestId.toString(),
        approverId: approval.approverId.toString(),
        approverType: approval.approverType,
        status: approval.status,
        comments: approval.comments,
        approvedAt: approval.approvedAt instanceof Date ? approval.approvedAt.toISOString() : approval.approvedAt,
        createdAt: approval.createdAt instanceof Date ? approval.createdAt.toISOString() : approval.createdAt,
        updatedAt: approval.updatedAt instanceof Date ? approval.updatedAt.toISOString() : approval.updatedAt,
        approver: approval.approver ? {
          id: approval.approver.id.toString(),
          firstName: approval.approver.firstName,
          lastName: approval.approver.lastName,
          position: approval.approver.position,
          department: approval.approver.department,
        } : undefined,
      })),
    };
  }

  private calculateOvertimeMinutes(startTime: Date, endTime: Date): number {
    const diffMs = endTime.getTime() - startTime.getTime();
    return Math.round(diffMs / (1000 * 60)); // Convert to minutes
  }

  async create(
    tenantSlug: string,
    createOvertimeRequestDto: CreateOvertimeRequestDto): Promise<OvertimeRequestResponseDto> {
    const { employeeId, date, startTime, endTime, reason } = createOvertimeRequestDto;

    // Validate that end time is after start time
    const startDateTime = new Date(startTime);
    const endDateTime = new Date(endTime);
    
    if (endDateTime <= startDateTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // Check if there's already an overtime request for this employee on this date
    const existingRequest = await this.overtimeRequestRepository.checkExistingRequest(
      tenantSlug,
      BigInt(employeeId),
      new Date(date)
    );

    if (existingRequest) {
      throw new BadRequestException(
        `An overtime request for ${date} already exists with status: ${existingRequest.status}`
      );
    }

    // Find attendance record for this employee on this date
    const attendance = await this.overtimeRequestRepository.findAttendanceByDate(
      tenantSlug,
      BigInt(employeeId),
      new Date(date)
    );

    // Calculate total minutes
    const totalMinutes = this.calculateOvertimeMinutes(startDateTime, endDateTime);

    // TODO: Add validation against attendance period and max hours settings
    // TODO: Check if employee has clocked out for the day

    const overtimeRequest = await this.overtimeRequestRepository.create(tenantSlug,{
      employee: {
        connect: { id: BigInt(employeeId) }
      },
      attendance: attendance ? {
        connect: { id: attendance.id }
      } : undefined,
      date: new Date(date),
      startTime: startDateTime,
      endTime: endDateTime,
      totalMinutes,
      reason,
      status: OvertimeStatus.PENDING,
    });

    // Create approval workflow
    await this.createApprovalWorkflow(tenantSlug, overtimeRequest.id, BigInt(employeeId));

    const createdRequest = await this.overtimeRequestRepository.findUnique(
      tenantSlug,
      { id: overtimeRequest.id },
      {
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
      }
    );

    return this.transformOvertimeResponse(createdRequest);
  }

  private async createApprovalWorkflow(tenantSlug: string, overtimeRequestId: bigint, employeeId: bigint): Promise<void> {
    // Get employee with manager information
    // This would need EmployeeRepository or EmployeeService to be injected
    // For now, we'll create a TODO to implement this properly
    
    // TODO: Inject EmployeeService to get manager information
    // TODO: Create manager approval record if employee has a manager
    // TODO: Create HR approval record 
    // TODO: Send notifications to approvers
    
    // Example workflow:
    // 1. If employee has manager -> create manager approval
    // 2. Always create HR approval (either after manager or direct)
    // 3. Send notification emails/websocket messages to approvers
    
    console.log(`Creating approval workflow for overtime request ${overtimeRequestId}`);
  }

  async findAll(
    tenantSlug: string,
    params: {
    skip?: number;
    take?: number;
    employeeId?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
    userRole?: Role;
    userId?: number;
  } = {}): Promise<PaginatedOvertimeResponseDto> {
    const { skip = 0, take = 10, employeeId, status, startDate, endDate, userRole, userId } = params;

    let where: any = {};

    // Role-based filtering
    if (userRole === Role.EMPLOYEE && userId) {
      where.employeeId = BigInt(userId);
    } else if (employeeId) {
      where.employeeId = BigInt(employeeId);
    }

    if (status) {
      where.status = status;
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const [requests, total] = await Promise.all([
      this.overtimeRequestRepository.findAll(
      tenantSlug,{
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
      }),
      this.overtimeRequestRepository.count(where)
    ]);

    return {
      requests: requests.map(request => this.transformOvertimeResponse(request)),
      total,
      skip,
      take
    };
  }

  async findOne(tenantSlug: string, id: number): Promise<OvertimeRequestResponseDto> {
    const overtimeRequest = await this.overtimeRequestRepository.findUnique(
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
      }
    );

    if (!overtimeRequest) {
      throw new NotFoundException(`Overtime request with ID ${id} not found`);
    }

    return this.transformOvertimeResponse(overtimeRequest);
  }

  async update(
    tenantSlug: string,
    id: number,
    updateOvertimeRequestDto: UpdateOvertimeRequestDto
  ): Promise<OvertimeRequestResponseDto> {
    const existingRequest = await this.overtimeRequestRepository.findUnique(
      tenantSlug, { id: BigInt(id) });
    
    if (!existingRequest) {
      throw new NotFoundException(`Overtime request with ID ${id} not found`);
    }

    // Only allow updates to pending requests or by HR/SUPER roles
    if (existingRequest.status !== OvertimeStatus.PENDING) {
      throw new BadRequestException('Can only update pending overtime requests');
    }

    const updateData: any = { ...updateOvertimeRequestDto };

    // Set finalized timestamp if status is changing to final state
    if (updateData.status && ['APPROVED', 'REJECTED', 'CANCELLED'].includes(updateData.status)) {
      updateData.finalizedAt = new Date();
    }

    const updatedRequest = await this.overtimeRequestRepository.update(
      tenantSlug,
      { id: BigInt(id) },
      updateData
    );

    const result = await this.overtimeRequestRepository.findUnique(
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
      }
    );

    return this.transformOvertimeResponse(result);
  }

  async remove(tenantSlug: string, id: number): Promise<void> {
    const overtimeRequest = await this.overtimeRequestRepository.findUnique(
      tenantSlug, { id: BigInt(id) });
    
    if (!overtimeRequest) {
      throw new NotFoundException(`Overtime request with ID ${id} not found`);
    }

    // Only allow deletion of pending requests
    if (overtimeRequest.status !== OvertimeStatus.PENDING) {
      throw new BadRequestException('Can only delete pending overtime requests');
    }

    await this.overtimeRequestRepository.delete(
      tenantSlug, { id: BigInt(id) });
  }

  async getEmployeeOvertimeHistory(
    tenantSlug: string,
    employeeId: number,
    params?: {
      skip?: number;
      take?: number;
      status?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<OvertimeRequestResponseDto[]> {
    const { skip, take, status, startDate, endDate } = params || {};

    const requests = await this.overtimeRequestRepository.findByEmployee(
      tenantSlug,
      BigInt(employeeId),
      {
        skip,
        take,
        status,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined
      }
    );

    return requests.map(request => this.transformOvertimeResponse(request));
  }

  async getPendingRequests(
    tenantSlug: string,
    managerId?: number,
    params?: {
      skip?: number;
      take?: number;
    }
  ): Promise<OvertimeRequestResponseDto[]> {
    const { skip, take } = params || {};

    const requests = await this.overtimeRequestRepository.findPendingRequests(tenantSlug, {
      skip,
      take,
      managerId: managerId ? BigInt(managerId) : undefined
    });

    return requests.map(request => this.transformOvertimeResponse(request));
  }

  async getTotalOvertimeHours(
    tenantSlug: string,
    employeeId: number,
    startDate: string,
    endDate: string,
    status?: string
  ): Promise<{ totalMinutes: number; totalHours: number }> {
    const totalMinutes = await this.overtimeRequestRepository.getTotalOvertimeMinutes(
      tenantSlug,
      BigInt(employeeId),
      new Date(startDate),
      new Date(endDate),
      status
    );

    return {
      totalMinutes,
      totalHours: Math.round((totalMinutes / 60) * 100) / 100 // Round to 2 decimal places
    };
  }

  async getEmployeeIdByUserId(tenantSlug: string, userId: string): Promise<bigint | null> {
    return this.overtimeRequestRepository.getEmployeeIdByUserId(tenantSlug, BigInt(userId));
  }
}
