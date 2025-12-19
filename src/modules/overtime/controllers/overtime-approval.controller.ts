import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiBody, ApiParam } from '@nestjs/swagger';
import { OvertimeApprovalService } from '../services/overtime-approval.service';
import { CreateOvertimeApprovalDto, UpdateOvertimeApprovalDto, ApprovalStatus, ApproverType } from '../dto/overtime-approval.dto';
import { OvertimeApprovalResponseDto } from '../dto/overtime-response.dto';

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('overtime-approvals')
@Controller(':tenant_slug/overtime-approvals')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer')
export class OvertimeApprovalController {
  constructor(private readonly overtimeApprovalService: OvertimeApprovalService) {}

  @Post()
  @Roles(Role.SUPER, Role.ADMIN, Role.HR, Role.MANAGER)
  @ApiOperation({ summary: 'Create overtime approval (SUPER/HR/MANAGER only)' })
  @ApiBody({
    type: CreateOvertimeApprovalDto,
    description: 'Overtime approval data',
    examples: {
      example1: {
        summary: 'Manager Approval',
        description: 'Manager approving an overtime request',
        value: {
          overtimeRequestId: 123,
          approverId: 456,
          approverType: 'MANAGER',
          status: 'APPROVED',
          comments: 'Approved due to project urgency'
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Overtime approval created successfully', type: OvertimeApprovalResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input data or approval already exists' })
  @ApiResponse({ status: 404, description: 'Overtime request not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - SUPER/HR/MANAGER role required' })
  async create(
    @Param('tenant_slug') tenantSlug: string, @Body() createOvertimeApprovalDto: CreateOvertimeApprovalDto): Promise<OvertimeApprovalResponseDto> {
    return this.overtimeApprovalService.create(tenantSlug, createOvertimeApprovalDto);
  }

  @Post('process')
  @Roles(Role.SUPER, Role.ADMIN, Role.HR, Role.MANAGER)
  @ApiOperation({ summary: 'Process overtime approval (approve/reject)' })
  @ApiBody({
    description: 'Approval processing data',
    examples: {
      example1: {
        summary: 'Approve Request',
        description: 'Manager approving an overtime request',
        value: {
          overtimeRequestId: 123,
          approverId: 456,
          approverType: 'MANAGER',
          status: 'APPROVED',
          comments: 'Approved for urgent project completion'
        }
      },
      example2: {
        summary: 'Reject Request',
        description: 'HR rejecting an overtime request',
        value: {
          overtimeRequestId: 123,
          approverId: 789,
          approverType: 'HR',
          status: 'REJECTED',
          comments: 'Insufficient justification for overtime'
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Overtime approval processed successfully', type: OvertimeApprovalResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Overtime request not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - SUPER/HR/MANAGER role required' })
  async processApproval(
    @Param('tenant_slug') tenantSlug: string,
    @Body() body: {
      overtimeRequestId: number;
      approverId: number;
      approverType: ApproverType;
      status: ApprovalStatus;
      comments?: string;
    }
  ): Promise<OvertimeApprovalResponseDto> {
    const { overtimeRequestId, approverId, approverType, status, comments } = body;
    
    return this.overtimeApprovalService.processApproval(
      tenantSlug,
      overtimeRequestId,
      approverId,
      approverType,
      status,
      comments
    );
  }

  @Get()
  @Roles(Role.SUPER, Role.ADMIN, Role.HR, Role.MANAGER)
  @ApiOperation({ summary: 'Get overtime approvals with filtering and pagination (SUPER/HR/MANAGER only)' })
  @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Number of records to skip' })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Number of records to take' })
  @ApiQuery({ name: 'approverId', required: false, type: Number, description: 'Filter by approver ID' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by approval status' })
  @ApiQuery({ name: 'approverType', required: false, type: String, description: 'Filter by approver type (MANAGER/HR)' })
  @ApiResponse({ status: 200, description: 'Overtime approvals retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - SUPER/HR/MANAGER role required' })
  async findAll(
    @Param('tenant_slug') tenantSlug: string,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('approverId', new ParseIntPipe({ optional: true })) approverId?: number,
    @Query('status') status?: string,
    @Query('approverType') approverType?: string,
    @Request() req?: any,
  ) {
    // Managers can only see their own approvals
    if (req.user.role === Role.MANAGER && !approverId) {
      approverId = Number(req.user.employee?.id);
    }
    
    return this.overtimeApprovalService.findAll(tenantSlug, {
      skip,
      take,
      approverId,
      status,
      approverType
    });
  }

  @Get('pending')
  @Roles(Role.SUPER, Role.ADMIN, Role.HR, Role.MANAGER)
  @ApiOperation({ summary: 'Get pending approvals for current user (SUPER/HR/MANAGER only)' })
  @ApiQuery({ name: 'approverType', required: false, type: String, description: 'Filter by approver type (MANAGER/HR)' })
  @ApiResponse({ status: 200, description: 'Pending approvals retrieved successfully', type: [OvertimeApprovalResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - SUPER/HR/MANAGER role required' })
  async getPendingApprovals(
    @Param('tenant_slug') tenantSlug: string,
    @Query('approverType') approverType?: string,
    @Request() req?: any,
  ): Promise<OvertimeApprovalResponseDto[]> {
    let approverId = undefined;
    let filterApproverType = approverType;
    
    // Set default approver type based on user role
    if (req.user.role === Role.MANAGER) {
      approverId = Number(req.user.employee?.id);
      filterApproverType = filterApproverType || ApproverType.MANAGER;
    } else if (req.user.role === Role.HR) {
      filterApproverType = filterApproverType || ApproverType.HR;
    }
    
    return this.overtimeApprovalService.getPendingApprovals(tenantSlug, approverId, filterApproverType);
  }

  @Get('stats')
  @Roles(Role.SUPER, Role.ADMIN, Role.HR, Role.MANAGER)
  @ApiOperation({ summary: 'Get approval statistics (SUPER/HR/MANAGER only)' })
  @ApiQuery({ name: 'approverId', required: false, type: Number, description: 'Filter by approver ID' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Approval statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - SUPER/HR/MANAGER role required' })
  async getApprovalStats(
    @Param('tenant_slug') tenantSlug: string,
    @Query('approverId', new ParseIntPipe({ optional: true })) approverId?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ): Promise<Record<string, number>> {
    // Managers can only see their own stats
    if (req.user.role === Role.MANAGER && !approverId) {
      approverId = Number(req.user.employee?.id);
    }
    
    return this.overtimeApprovalService.getApprovalStats(tenantSlug, approverId, startDate, endDate);
  }

  @Get(':id')
  @Roles(Role.SUPER, Role.ADMIN,Role.HR, Role.MANAGER)
  @ApiOperation({ summary: 'Get overtime approval by ID (SUPER/HR/MANAGER only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Overtime approval ID' })
  @ApiResponse({ status: 200, description: 'Overtime approval retrieved successfully', type: OvertimeApprovalResponseDto })
  @ApiResponse({ status: 404, description: 'Overtime approval not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - SUPER/HR/MANAGER role required' })
  async findOne(
    @Param('tenant_slug') tenantSlug: string, 
    @Param('id', ParseIntPipe) id: number): Promise<OvertimeApprovalResponseDto> {
    return this.overtimeApprovalService.findOne(tenantSlug, id);
  }

  @Patch(':id')
  @Roles(Role.SUPER, Role.ADMIN, Role.HR, Role.MANAGER)
  @ApiOperation({ summary: 'Update overtime approval (SUPER/HR/MANAGER only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Overtime approval ID' })
  @ApiBody({ type: UpdateOvertimeApprovalDto, description: 'Overtime approval update data' })
  @ApiResponse({ status: 200, description: 'Overtime approval updated successfully', type: OvertimeApprovalResponseDto })
  @ApiResponse({ status: 404, description: 'Overtime approval not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - SUPER/HR/MANAGER role required' })
  async update(
    @Param('tenant_slug') tenantSlug: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOvertimeApprovalDto: UpdateOvertimeApprovalDto
  ): Promise<OvertimeApprovalResponseDto> {
    return this.overtimeApprovalService.update(tenantSlug, id, updateOvertimeApprovalDto);
  }

  @Delete(':id')
  @Roles(Role.SUPER, Role.ADMIN, Role.HR)
  @ApiOperation({ summary: 'Delete overtime approval (SUPER/HR only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Overtime approval ID' })
  @ApiResponse({ status: 200, description: 'Overtime approval deleted successfully' })
  @ApiResponse({ status: 404, description: 'Overtime approval not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - SUPER/HR role required' })
  async remove(
    @Param('tenant_slug') tenantSlug: string, 
    @Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    await this.overtimeApprovalService.remove(tenantSlug, id);
    return { message: `Overtime approval with ID ${id} has been deleted successfully` };
  }
}
