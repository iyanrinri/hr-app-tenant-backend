import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { LeaveRequestRepository } from '../repositories/leave-request.repository';
import { LeaveBalanceRepository } from '../repositories/leave-balance.repository';
import { LeaveEmailService } from './leave-email.service';
import { 
  CreateLeaveRequestDto, 
  LeaveRequestResponseDto, 
  ApproveLeaveRequestDto,
  RejectLeaveRequestDto,
  LeaveRequestHistoryDto,
  LeaveRequestStatus
} from '../dto/leave-request.dto';
import { Role } from '@prisma/client';

@Injectable()
export class LeaveRequestService {
  constructor(
    private readonly leaveRequestRepository: LeaveRequestRepository,
    private readonly leaveBalanceRepository: LeaveBalanceRepository,
    private readonly leaveEmailService: LeaveEmailService,
    private readonly prisma: PrismaService
  ) {}

  async submitRequest(
    tenantSlug: string,
    createDto: CreateLeaveRequestDto,
    employeeId: number
  ): Promise<LeaveRequestResponseDto> {
    const startDate = new Date(createDto.startDate);
    const endDate = new Date(createDto.endDate);

    // Validate dates
    if (startDate > endDate) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    if (startDate < new Date()) {
      throw new BadRequestException('Cannot request leave for past dates');
    }

    // Calculate total days
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Get active period
    const activePeriod = await this.leaveBalanceRepository.findActivePeriod(tenantSlug);
    if (!activePeriod) {
      throw new BadRequestException('No active leave period found');
    }

    // Get or create employee balance for this leave type
    let balance = await this.leaveBalanceRepository.findSpecific(
      tenantSlug,
      BigInt(employeeId),
      activePeriod.id,
      BigInt(createDto.leaveTypeConfigId)
    );

    if (!balance) {
      // Auto-initialize balance if not found
      balance = await this.leaveBalanceRepository.initializeBalance(
        tenantSlug,
        BigInt(employeeId),
        BigInt(createDto.leaveTypeConfigId)
      );
    }

    // Additional null check after initialization
    if (!balance) {
      throw new Error('Failed to initialize leave balance');
    }

    // Check if employee has sufficient balance
    const availableBalance = balance!.totalQuota - balance!.usedQuota;
    if (totalDays > availableBalance) {
      throw new BadRequestException(
        `Insufficient leave balance. Available: ${availableBalance} days, Requested: ${totalDays} days`
      );
    }

    // Check advance notice requirement
    const advanceNoticeDays = balance!.leaveTypeConfig.advanceNoticeDays;
    const noticeDate = new Date();
    noticeDate.setDate(noticeDate.getDate() + advanceNoticeDays);
    
    if (startDate < noticeDate) {
      throw new BadRequestException(
        `This leave type requires ${advanceNoticeDays} days advance notice`
      );
    }

    // Check maximum consecutive days
    const maxConsecutiveDays = balance!.leaveTypeConfig.maxConsecutiveDays;
    if (maxConsecutiveDays && totalDays > maxConsecutiveDays) {
      throw new BadRequestException(
        `Maximum consecutive days for this leave type is ${maxConsecutiveDays} days`
      );
    }

    // Check for overlapping requests
    const overlapping = await this.leaveRequestRepository.findConflicting(
      tenantSlug,
      BigInt(employeeId),
      startDate,
      endDate
    );

    if (overlapping.length > 0) {
      throw new BadRequestException('Leave request overlaps with existing request');
    }

    // Create the leave request
    const leaveRequest = await this.leaveRequestRepository.create(tenantSlug, {
      employee: { connect: { id: BigInt(employeeId) } },
      leaveTypeConfig: { connect: { id: BigInt(createDto.leaveTypeConfigId) } },
      leavePeriod: { connect: { id: activePeriod.id } },
      startDate,
      endDate,
      totalDays,
      reason: createDto.reason,
      status: LeaveRequestStatus.PENDING,
      emergencyContact: createDto.emergencyContact,
      handoverNotes: createDto.handoverNotes,
      submittedAt: new Date()
    });

    // Update pending quota (use activePeriod.id)
    await this.leaveBalanceRepository.updateQuotas(
      tenantSlug,
      BigInt(employeeId),
      activePeriod.id,
      BigInt(createDto.leaveTypeConfigId),
      totalDays
    );

    // Send notification to manager/HR
    await this.leaveEmailService.notifyLeaveSubmission(
      leaveRequest,
      'manager@company.com', // You might want to get actual manager email
      'hr@company.com'
    );

    return this.mapToResponseDto(leaveRequest);
  }

  async getEmployeeRequests(
    tenantSlug: string,
    employeeId: number,
    filters: {
      status?: LeaveRequestStatus;
      startDate?: string;
      endDate?: string;
      page: number;
      limit: number;
    }
  ): Promise<LeaveRequestHistoryDto[]> {
    const skip = (filters.page - 1) * filters.limit;
    
    const whereConditions: any = {
      employeeId: BigInt(employeeId)
    };

    if (filters.status) {
      whereConditions.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      whereConditions.startDate = {};
      if (filters.startDate) {
        whereConditions.startDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        whereConditions.startDate.lte = new Date(filters.endDate);
      }
    }

    const requests = await this.leaveRequestRepository.findByEmployee(
      tenantSlug,
      BigInt(employeeId),
      { 
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        status: filters.status
      }
    );

    return requests.map((request: any) => this.mapToHistoryDto(request));
  }

  async getRequestDetails(
    tenantSlug: string,
    requestId: number,
    employeeId: number,
    userRole: Role
  ): Promise<LeaveRequestResponseDto> {
    const request = await this.leaveRequestRepository.findById(tenantSlug, BigInt(requestId));
    
    if (!request) {
      throw new NotFoundException(`Leave request with ID ${requestId} not found`);
    }

    // Check access permissions
    if (userRole === Role.EMPLOYEE && Number(request.employeeId) !== employeeId) {
      throw new ForbiddenException('You can only view your own leave requests');
    }

    return this.mapToResponseDto(request);
  }

  async cancelRequest(tenantSlug: string, requestId: number, employeeId: number): Promise<LeaveRequestResponseDto> {
    const request = await this.leaveRequestRepository.findById(tenantSlug, BigInt(requestId));
    
    if (!request) {
      throw new NotFoundException(`Leave request with ID ${requestId} not found`);
    }

    if (Number(request.employeeId) !== employeeId) {
      throw new ForbiddenException('You can only cancel your own leave requests');
    }

    if (request.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be cancelled');
    }

    // Update request status
    const updatedRequest = await this.leaveRequestRepository.update(tenantSlug, BigInt(requestId), {
      status: LeaveRequestStatus.CANCELLED
    });

    // Update pending quota (reduce it)
    // Get active period first
    const activePeriod = await this.leaveBalanceRepository.findActivePeriod(tenantSlug);
    if (!activePeriod) {
      throw new BadRequestException('No active leave period found');
    }

    // Update balance - revert the pending quota
    const balance = await this.leaveBalanceRepository.findByEmployeeAndType(
      tenantSlug,
      BigInt(employeeId),
      request.leaveTypeConfigId
    );

    if (balance) {
      await this.leaveBalanceRepository.updateQuotas(
        tenantSlug,
        BigInt(employeeId),
        activePeriod.id,
        request.leaveTypeConfigId,
        -request.totalDays // Negative to revert
      );
    }

    // Send cancellation notification
    // await this.leaveEmailService.notifyLeaveApproval(updatedRequest, { firstName: 'System', lastName: '', position: 'System' }, false, 'Request cancelled by employee');

    return this.mapToResponseDto(updatedRequest);
  }

  async getPendingApprovals(
    tenantSlug: string,
    approverId: number,
    approverRole: Role,
    filters: {
      department?: string;
      page: number;
      limit: number;
    }
  ): Promise<LeaveRequestHistoryDto[]> {
    const skip = (filters.page - 1) * filters.limit;
    
    // For HR/SUPER: show requests that are MANAGER_APPROVED OR PENDING requests from employees with no manager
    if (approverRole === Role.HR || approverRole === Role.SUPER) {
      const whereConditions: any = {
        OR: [
          { status: LeaveRequestStatus.MANAGER_APPROVED }, // Regular flow - waiting for HR approval
          { 
            status: LeaveRequestStatus.PENDING,
            employee: { managerId: null } // Employee has no manager - direct HR approval
          }
        ]
      };

      if (filters.department) {
        // Need to merge department filter with OR conditions
        whereConditions.OR = whereConditions.OR.map((condition: any) => ({
          ...condition,
          employee: {
            ...condition.employee,
            department: filters.department
          }
        }));
      }

      const paginatedRequests = await this.leaveRequestRepository.findAll(tenantSlug, {
        where: whereConditions,
        skip,
        take: filters.limit,
        orderBy: { submittedAt: 'asc' }
      });

      return paginatedRequests.map((request: any) => this.mapToHistoryDto(request));
    }
    
    // For Manager/Employee with subordinates: show PENDING requests from their subordinates
    const hasSubordinates = await this.checkHasSubordinates(BigInt(approverId));
    
    if (hasSubordinates || approverRole === Role.MANAGER) {
      const requests = await this.leaveRequestRepository.findPendingForApprover(tenantSlug, BigInt(approverId));
      
      // Apply pagination
      const paginatedRequests = requests.slice(skip, skip + filters.limit);
      return paginatedRequests.map((request: any) => this.mapToHistoryDto(request));
    }
    
    // If employee has no subordinates and not HR/SUPER, return empty array
    return [];
  }

  async approveRequest(
    tenantSlug: string,
    requestId: number,
    approverId: number,
    approverRole: Role,
    approveDto: ApproveLeaveRequestDto
  ): Promise<LeaveRequestResponseDto> {
    const request = await this.leaveRequestRepository.findById(tenantSlug, BigInt(requestId));
    
    if (!request) {
      throw new NotFoundException(`Leave request with ID ${requestId} not found`);
    }

    // Check if employee has manager
    const employee = await this.prisma.employee.findUnique({
      where: { id: request.employeeId },
      select: { managerId: true }
    });
    
    const hasManager = !!employee?.managerId;

    // Determine approval level based on current status and approver role
    let approvalLevel: 'MANAGER' | 'HR';
    
    if (approverRole === Role.HR || approverRole === Role.SUPER) {
      // HR approval logic
      if (hasManager) {
        // Employee has manager - HR can only approve MANAGER_APPROVED requests
        if (request.status !== LeaveRequestStatus.MANAGER_APPROVED) {
          throw new BadRequestException('HR can only approve requests that have been approved by manager first');
        }
      } else {
        // Employee has no manager - HR can approve PENDING requests directly
        if (request.status !== LeaveRequestStatus.PENDING) {
          throw new BadRequestException('Only pending requests can be approved');
        }
      }
      approvalLevel = 'HR';
    } else {
      // Manager approval logic
      if (request.status !== LeaveRequestStatus.PENDING) {
        throw new BadRequestException('Only pending requests can be approved by manager');
      }
      
      // Validate they can approve this request (must be their subordinate)
      if (!employee || employee.managerId !== BigInt(approverId)) {
        throw new ForbiddenException('You can only approve leave requests from your subordinates');
      }
      
      approvalLevel = 'MANAGER';
    }

    // Update request status and create approval record
    const updatedRequest = await this.leaveRequestRepository.approveRequest(
      tenantSlug,
      BigInt(requestId),
      BigInt(approverId),
      approveDto.comments || '',
      approvalLevel
    );

    // Only update leave balance when HR gives final approval
    if (approvalLevel === 'HR') {
      // Get active period first
      const activePeriod = await this.leaveBalanceRepository.findActivePeriod(tenantSlug);
      if (!activePeriod) {
        throw new BadRequestException('No active leave period found');
      }

      // Update leave balance (this confirms the quota usage)
      const balance = await this.leaveBalanceRepository.findByEmployeeAndType(
        tenantSlug,
        request.employeeId,
        request.leaveTypeConfigId
      );

      // Note: updateQuotas will handle incrementing used quota
      // No need to recalculate here since the quota was already allocated on submission
    }

    // Send approval notification
    // await this.leaveEmailService.notifyLeaveApproval(updatedRequest, { firstName: 'Manager', lastName: '', position: 'Manager' }, true, approveDto.comments);

    return this.mapToResponseDto(updatedRequest);
  }

  async rejectRequest(
    tenantSlug: string,
    requestId: number,
    approverId: number,
    approverRole: Role,
    rejectDto: RejectLeaveRequestDto
  ): Promise<LeaveRequestResponseDto> {
    const request = await this.leaveRequestRepository.findById(tenantSlug, BigInt(requestId));
    
    if (!request) {
      throw new NotFoundException(`Leave request with ID ${requestId} not found`);
    }

    // Validate status based on approver role
    if (approverRole === Role.HR || approverRole === Role.SUPER) {
      // HR can reject requests that are MANAGER_APPROVED
      if (request.status !== LeaveRequestStatus.MANAGER_APPROVED) {
        throw new BadRequestException('HR can only reject requests that have been approved by manager first');
      }
    } else {
      // Manager/Employee with subordinates can reject PENDING requests
      if (request.status !== LeaveRequestStatus.PENDING) {
        throw new BadRequestException('Only pending requests can be rejected by manager');
      }
      
      // Validate they can reject this request (must be their subordinate)
      const employee = await this.prisma.employee.findUnique({
        where: { id: request.employeeId },
        select: { managerId: true }
      });
      
      if (!employee || employee.managerId !== BigInt(approverId)) {
        throw new ForbiddenException('You can only reject leave requests from your subordinates');
      }
    }

    // Update request status and create approval record
    const updatedRequest = await this.leaveRequestRepository.rejectRequest(
      tenantSlug,
      BigInt(requestId),
      BigInt(approverId),
      rejectDto.rejectionReason,
      rejectDto.comments
    );

    // Get active period first
    const activePeriod = await this.leaveBalanceRepository.findActivePeriod(tenantSlug);
    if (!activePeriod) {
      throw new BadRequestException('No active leave period found');
    }

    // Update pending quota (reduce it since request is rejected) 
    const balance = await this.leaveBalanceRepository.findByEmployeeAndType(
      tenantSlug,
      request.employeeId,
      request.leaveTypeConfigId
    );

    if (balance) {
      await this.leaveBalanceRepository.updateQuotas(
        tenantSlug,
        request.employeeId,
        activePeriod.id,
        request.leaveTypeConfigId,
        -request.totalDays // Negative to revert
      );
    }

    // Send rejection notification
    // Send rejection notification
    // await this.leaveEmailService.notifyLeaveApproval(updatedRequest, { firstName: 'Manager', lastName: '', position: 'Manager' }, false, rejectDto.rejectionReason);

    return this.mapToResponseDto(updatedRequest);
  }

  private async checkHasSubordinates(employeeId: bigint): Promise<boolean> {
    const subordinatesCount = await this.prisma.employee.count({
      where: { 
        managerId: employeeId
      }
    });
    
    return subordinatesCount > 0;
  }

  private mapToResponseDto(request: any): LeaveRequestResponseDto {
    // Check if employee has manager
    const requiresManagerApproval = !!request.employee?.managerId;
    
    // Get approval statuses
    const { managerStatus, hrStatus } = this.getApprovalStatuses(request, requiresManagerApproval);
    
    return {
      id: request.id.toString(),
      employeeId: request.employeeId.toString(),
      employeeName: request.employee ? 
        `${request.employee.firstName} ${request.employee.lastName}` : 'Unknown',
      leaveTypeName: request.leaveTypeConfig?.name || 'Unknown',
      startDate: request.startDate.toISOString().split('T')[0],
      endDate: request.endDate.toISOString().split('T')[0],
      totalDays: request.totalDays,
      reason: request.reason,
      status: request.status,
      submittedAt: request.submittedAt ? request.submittedAt.toISOString() : request.createdAt.toISOString(),
      managerComments: request.managerComments,
      hrComments: request.hrComments,
      emergencyContact: request.emergencyContact,
      handoverNotes: request.handoverNotes,
      requiresManagerApproval: requiresManagerApproval,
      managerApprovalStatus: requiresManagerApproval ? managerStatus : undefined,
      managerApprovedAt: request.managerApprovedAt ? request.managerApprovedAt.toISOString() : undefined,
      hrApprovalStatus: hrStatus,
      hrApprovedAt: request.hrApprovedAt ? request.hrApprovedAt.toISOString() : undefined
    };
  }

  private mapToHistoryDto(request: any): LeaveRequestHistoryDto {
    const lastApproval = request.approvals && request.approvals.length > 0 
      ? request.approvals[request.approvals.length - 1] 
      : null;
      
    // Check if employee has manager
    const requiresManagerApproval = !!request.employee?.managerId;
    
    // Get approval statuses
    const { managerStatus, hrStatus } = this.getApprovalStatuses(request, requiresManagerApproval);

    return {
      id: request.id.toString(),
      leaveTypeName: request.leaveTypeConfig?.name || 'Unknown',
      startDate: request.startDate.toISOString().split('T')[0],
      endDate: request.endDate.toISOString().split('T')[0],
      totalDays: request.totalDays,
      reason: request.reason,
      status: request.status,
      submittedAt: request.submittedAt ? request.submittedAt.toISOString() : request.createdAt.toISOString(),
      approvedAt: lastApproval?.approvedAt ? lastApproval.approvedAt.toISOString() : undefined,
      approvedBy: lastApproval?.approver ? 
        `${lastApproval.approver.firstName} ${lastApproval.approver.lastName}` : undefined,
      approverComments: lastApproval?.comments,
      requiresManagerApproval: requiresManagerApproval,
      managerApprovalStatus: requiresManagerApproval ? managerStatus : undefined,
      managerApprovedAt: request.managerApprovedAt ? request.managerApprovedAt.toISOString() : undefined,
      hrApprovalStatus: hrStatus,
      hrApprovedAt: request.hrApprovedAt ? request.hrApprovedAt.toISOString() : undefined
    };
  }

  private getApprovalStatuses(request: any, requiresManagerApproval: boolean) {
    let managerStatus = 'PENDING';
    let hrStatus = 'PENDING';
    
    if (requiresManagerApproval) {
      // Employee has manager - two-level approval
      if (request.status === 'PENDING') {
        managerStatus = 'PENDING';
        hrStatus = 'PENDING';
      } else if (['MANAGER_APPROVED', 'HR_APPROVED', 'APPROVED'].includes(request.status)) {
        managerStatus = 'APPROVED';
        hrStatus = ['HR_APPROVED', 'APPROVED'].includes(request.status) ? 'APPROVED' : 'PENDING';
      } else if (request.status === 'REJECTED') {
        if (request.managerApprovedAt) {
          // Rejected by HR
          managerStatus = 'APPROVED';
          hrStatus = 'REJECTED';
        } else {
          // Rejected by manager
          managerStatus = 'REJECTED';
          hrStatus = 'PENDING';
        }
      }
    } else {
      // Employee has no manager - direct HR approval
      if (['PENDING'].includes(request.status)) {
        hrStatus = 'PENDING';
      } else if (['APPROVED', 'HR_APPROVED'].includes(request.status)) {
        hrStatus = 'APPROVED';
      } else if (request.status === 'REJECTED') {
        hrStatus = 'REJECTED';
      }
    }
    
    return { managerStatus, hrStatus };
  }
}