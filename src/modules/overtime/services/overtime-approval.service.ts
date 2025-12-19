import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { OvertimeApprovalRepository } from '../repositories/overtime-approval.repository';
import { OvertimeRequestRepository } from '../repositories/overtime-request.repository';
import { CreateOvertimeApprovalDto, UpdateOvertimeApprovalDto, ApprovalStatus, ApproverType } from '../dto/overtime-approval.dto';
import { OvertimeApprovalResponseDto } from '../dto/overtime-response.dto';
import { OvertimeStatus } from '../dto/update-overtime-request.dto';
import { Role } from '@prisma/client';

@Injectable()
export class OvertimeApprovalService {
  constructor(
    private overtimeApprovalRepository: OvertimeApprovalRepository,
    private overtimeRequestRepository: OvertimeRequestRepository,
  ) {}

  private transformApprovalResponse(approval: any): OvertimeApprovalResponseDto {
    return {
      ...approval,
      id: approval.id.toString(),
      overtimeRequestId: approval.overtimeRequestId.toString(),
      approverId: approval.approverId.toString(),
      approver: approval.approver ? {
        id: approval.approver.id.toString(),
        firstName: approval.approver.firstName,
        lastName: approval.approver.lastName,
        position: approval.approver.position,
        department: approval.approver.department,
      } : undefined,
    };
  }

  async create(tenantSlug: string, createOvertimeApprovalDto: CreateOvertimeApprovalDto): Promise<OvertimeApprovalResponseDto> {
    const { overtimeRequestId, approverId, approverType, status, comments } = createOvertimeApprovalDto;

    // Check if overtime request exists
    const overtimeRequest = await this.overtimeRequestRepository.findUnique(tenantSlug, {
      id: BigInt(overtimeRequestId)
    });

    if (!overtimeRequest) {
      throw new NotFoundException(`Overtime request with ID ${overtimeRequestId} not found`);
    }

    // Check if approval already exists
    const existingApproval = await this.overtimeApprovalRepository.findExisting(
      tenantSlug,
      BigInt(overtimeRequestId),
      BigInt(approverId),
      approverType
    );

    if (existingApproval) {
      throw new BadRequestException(
        `Approval already exists for this overtime request by this approver`
      );
    }

    const approvalData: any = {
      overtimeRequestId: BigInt(overtimeRequestId),
      approverId: BigInt(approverId),
      approverType,
      status,
      comments
    };

    if (status === ApprovalStatus.APPROVED) {
      approvalData.approvedAt = new Date();
    }

    const approval = await this.overtimeApprovalRepository.create(tenantSlug, approvalData);

    // Update overtime request status based on approval
    await this.updateOvertimeRequestStatus(tenantSlug, BigInt(overtimeRequestId));

    const createdApproval = await this.overtimeApprovalRepository.findUnique(
      tenantSlug,
      { id: approval.id },
      {
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
    );

    return this.transformApprovalResponse(createdApproval);
  }

  async processApproval(
    tenantSlug: string,
    overtimeRequestId: number,
    approverId: number,
    approverType: ApproverType,
    status: ApprovalStatus,
    comments?: string
  ): Promise<OvertimeApprovalResponseDto> {
    // Check if approval exists
    const existingApproval = await this.overtimeApprovalRepository.findExisting(
      tenantSlug,
      BigInt(overtimeRequestId),
      BigInt(approverId),
      approverType
    );

    if (!existingApproval) {
      // Create new approval
      return this.create(
      tenantSlug, {
        overtimeRequestId,
        approverId,
        approverType,
        status,
        comments
      });
    } else {
      // Update existing approval
      return this.update(tenantSlug, Number(existingApproval.id), {
        status,
        comments
      });
    }
  }

  private async updateOvertimeRequestStatus(tenantSlug: string, overtimeRequestId: bigint): Promise<void> {
    const approvals = await this.overtimeApprovalRepository.findByRequest(tenantSlug, overtimeRequestId);
    
    const managerApproval = approvals.find(a => a.approverType === ApproverType.MANAGER);
    const hrApproval = approvals.find(a => a.approverType === ApproverType.HR);

    let newStatus = OvertimeStatus.PENDING;
    let managerApprovedAt = null;
    let hrApprovedAt = null;
    let finalizedAt = null;

    // Check for rejections first
    if (approvals.some(a => a.status === ApprovalStatus.REJECTED)) {
      newStatus = OvertimeStatus.REJECTED;
      finalizedAt = new Date();
    }
    // Check approval flow
    else if (managerApproval?.status === ApprovalStatus.APPROVED && hrApproval?.status === ApprovalStatus.APPROVED) {
      newStatus = OvertimeStatus.APPROVED;
      managerApprovedAt = managerApproval.approvedAt;
      hrApprovedAt = hrApproval.approvedAt;
      finalizedAt = new Date();
    }
    else if (hrApproval?.status === ApprovalStatus.APPROVED && !managerApproval) {
      // Direct HR approval (for employees without managers)
      newStatus = OvertimeStatus.APPROVED;
      hrApprovedAt = hrApproval.approvedAt;
      finalizedAt = new Date();
    }
    else if (managerApproval?.status === ApprovalStatus.APPROVED && !hrApproval) {
      newStatus = OvertimeStatus.MANAGER_APPROVED;
      managerApprovedAt = managerApproval.approvedAt;
    }
    else if (hrApproval?.status === ApprovalStatus.APPROVED && managerApproval?.status === ApprovalStatus.PENDING) {
      newStatus = OvertimeStatus.HR_APPROVED;
      hrApprovedAt = hrApproval.approvedAt;
    }

    await this.overtimeRequestRepository.update(
      tenantSlug,
      { id: overtimeRequestId },
      {
        status: newStatus,
        managerApprovedAt,
        hrApprovedAt,
        finalizedAt
      }
    );
  }

  async findAll(tenantSlug: string, params: {
    skip?: number;
    take?: number;
    approverId?: number;
    status?: string;
    approverType?: string;
  } = {}): Promise<{ approvals: OvertimeApprovalResponseDto[]; total: number }> {
    const { skip = 0, take = 10, approverId, status, approverType } = params;

    const where: any = {};
    if (approverId) where.approverId = BigInt(approverId);
    if (status) where.status = status;
    if (approverType) where.approverType = approverType;

    const [approvals, total] = await Promise.all([
      this.overtimeApprovalRepository.findAll(
      tenantSlug, {
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
      }),
      this.overtimeApprovalRepository.count(where)
    ]);

    return {
      approvals: approvals.map(approval => this.transformApprovalResponse(approval)),
      total
    };
  }

  async findOne(tenantSlug: string, id: number): Promise<OvertimeApprovalResponseDto> {
    const approval = await this.overtimeApprovalRepository.findUnique(
      tenantSlug,
      { id: BigInt(id) },
      {
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
    );

    if (!approval) {
      throw new NotFoundException(`Overtime approval with ID ${id} not found`);
    }

    return this.transformApprovalResponse(approval);
  }

  async update(
    tenantSlug: string,
    id: number,
    updateOvertimeApprovalDto: UpdateOvertimeApprovalDto
  ): Promise<OvertimeApprovalResponseDto> {
    const existingApproval = await this.overtimeApprovalRepository.findUnique(tenantSlug, { id: BigInt(id) });
    
    if (!existingApproval) {
      throw new NotFoundException(`Overtime approval with ID ${id} not found`);
    }

    const updateData: any = { ...updateOvertimeApprovalDto };

    if (updateData.status === ApprovalStatus.APPROVED) {
      updateData.approvedAt = new Date();
    }

    const updatedApproval = await this.overtimeApprovalRepository.update(
      tenantSlug,
      { id: BigInt(id) },
      updateData
    );

    // Update overtime request status
    await this.updateOvertimeRequestStatus(
      tenantSlug, existingApproval.overtimeRequestId);

    const result = await this.overtimeApprovalRepository.findUnique(
      tenantSlug,
      { id: BigInt(id) },
      {
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
    );

    return this.transformApprovalResponse(result);
  }

  async getPendingApprovals(
    tenantSlug: string,
    approverId?: number,
    approverType?: string
  ): Promise<OvertimeApprovalResponseDto[]> {
    const approvals = await this.overtimeApprovalRepository.findPendingApprovals(
      tenantSlug,
      approverId ? BigInt(approverId) : undefined,
      approverType
    );

    return approvals.map(approval => this.transformApprovalResponse(approval));
  }

  async getApprovalStats(
    tenantSlug: string,
    approverId?: number,
    startDate?: string,
    endDate?: string
  ): Promise<Record<string, number>> {
    return this.overtimeApprovalRepository.getApprovalStats(
      tenantSlug,
      approverId ? BigInt(approverId) : undefined,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
  }

  async remove(tenantSlug: string, id: number): Promise<void> {
    const approval = await this.overtimeApprovalRepository.findUnique(tenantSlug, { id: BigInt(id) });
    
    if (!approval) {
      throw new NotFoundException(`Overtime approval with ID ${id} not found`);
    }

    await this.overtimeApprovalRepository.delete(tenantSlug, { id: BigInt(id) });

    // Update overtime request status after deletion
    await this.updateOvertimeRequestStatus(tenantSlug, approval.overtimeRequestId);
  }
}
