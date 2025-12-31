import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete,
  Query,
  Request,
  ParseIntPipe, 
  UseGuards,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { LeaveRequestService } from '../services/leave-request.service';
import { EmployeesService } from '../../employees/employees.service';
import { 
  CreateLeaveRequestDto, 
  LeaveRequestResponseDto, 
  ApproveLeaveRequestDto,
  RejectLeaveRequestDto,
  LeaveRequestHistoryDto,
  LeaveRequestStatus
} from '../dto/leave-request.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('leave-requests')
@Controller(':tenant_slug/leave-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer')
export class LeaveRequestController {
  constructor(
    private readonly leaveRequestService: LeaveRequestService,
    private readonly employeeService: EmployeesService
  ) {}

  @Post()
  @Roles(Role.EMPLOYEE, Role.HR, Role.SUPER)
  @ApiOperation({ summary: 'Submit a new leave request' })
  @ApiBody({ type: CreateLeaveRequestDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Leave request submitted successfully',
    type: LeaveRequestResponseDto
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid dates or insufficient balance' })
  async submitLeaveRequest(
    @Param('tenant_slug') tenantSlug: string,
    @Body() createDto: CreateLeaveRequestDto,
    @Request() req: any
  ): Promise<LeaveRequestResponseDto> {
    const userId = req.user.id;
    const employee = await this.employeeService.findByUserId(tenantSlug, userId);
    return this.leaveRequestService.submitRequest(tenantSlug, createDto, Number(employee.id));
  }

  @Get('my')
  @Roles(Role.EMPLOYEE, Role.HR, Role.SUPER)
  @ApiOperation({ summary: 'Get my leave requests' })
  @ApiQuery({ name: 'status', required: false, enum: LeaveRequestStatus })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter from start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter to end date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ 
    status: 200, 
    description: 'Leave requests retrieved successfully',
    type: LeaveRequestHistoryDto
  })
  async getMyLeaveRequests(
    @Param('tenant_slug') tenantSlug: string,
    @Request() req: any,
    @Query('status') status?: LeaveRequestStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ): Promise<LeaveRequestHistoryDto[]> {
    const userId = req.user.id;
    const employee = await this.employeeService.findByUserId(tenantSlug, userId);
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 10;
    
    return this.leaveRequestService.getEmployeeRequests(
      tenantSlug,
      Number(employee.id),
      { status, startDate, endDate, page: pageNum, limit: limitNum }
    );
  }

  @Get(':id')
  @Roles(Role.EMPLOYEE, Role.HR, Role.SUPER)
  @ApiOperation({ summary: 'Get leave request details' })
  @ApiParam({ name: 'id', type: 'number', description: 'Leave request ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Leave request details retrieved successfully',
    type: LeaveRequestResponseDto
  })
  async getLeaveRequest(
    @Param('tenant_slug') tenantSlug: string,
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any
  ): Promise<LeaveRequestResponseDto> {
    const userId = req.user.id;
    const employee = await this.employeeService.findByUserId(tenantSlug, userId);
    return this.leaveRequestService.getRequestDetails(tenantSlug, id, Number(employee.id), req.user.role);
  }

  @Patch(':id/cancel')
  @Roles(Role.EMPLOYEE, Role.HR, Role.SUPER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending leave request' })
  @ApiParam({ name: 'id', type: 'number', description: 'Leave request ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Leave request cancelled successfully',
    type: LeaveRequestResponseDto
  })
  async cancelLeaveRequest(
    @Param('tenant_slug') tenantSlug: string,
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any
  ): Promise<LeaveRequestResponseDto> {
    const userId = req.user.id;
    const employee = await this.employeeService.findByUserId(tenantSlug, userId);
    return this.leaveRequestService.cancelRequest(tenantSlug, id, Number(employee.id));
  }

  @Get('pending/for-approval')
  @Roles(Role.HR, Role.SUPER, Role.MANAGER, Role.EMPLOYEE)
  @ApiOperation({ 
    summary: 'Get leave requests pending for approval',
    description: 'Manager/Employee with subordinates: See PENDING requests from subordinates. HR/SUPER: See MANAGER_APPROVED requests waiting for final approval.'
  })
  @ApiQuery({ name: 'department', required: false, description: 'Filter by department' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ 
    status: 200, 
    description: 'Pending leave requests retrieved successfully',
    type: LeaveRequestHistoryDto
  })
  async getPendingApprovals(
    @Param('tenant_slug') tenantSlug: string,
    @Request() req: any,
    @Query('department') department?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ): Promise<LeaveRequestHistoryDto[]> {
    const userId = req.user.id;
    const employee = await this.employeeService.findByUserId(tenantSlug, userId);
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 10;
    
    return this.leaveRequestService.getPendingApprovals(
      tenantSlug,
      Number(employee.id),
      req.user.role,
      { department, page: pageNum, limit: limitNum }
    );
  }

  @Patch(':id/approve')
  @Roles(Role.HR, Role.SUPER, Role.MANAGER, Role.EMPLOYEE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Approve a leave request', 
    description: 'Two-level approval: 1) Manager approves PENDING→MANAGER_APPROVED, 2) HR approves MANAGER_APPROVED→APPROVED'
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Leave request ID' })
  @ApiBody({ type: ApproveLeaveRequestDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Leave request approved successfully',
    type: LeaveRequestResponseDto
  })
  async approveLeaveRequest(
    @Param('tenant_slug') tenantSlug: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() approveDto: ApproveLeaveRequestDto,
    @Request() req: any
  ): Promise<LeaveRequestResponseDto> {
    const userId = req.user.id;
    const employee = await this.employeeService.findByUserId(tenantSlug, userId);
    return this.leaveRequestService.approveRequest(
      tenantSlug,
      id,
      Number(employee.id),
      req.user.role,
      approveDto
    );
  }  @Patch(':id/reject')
  @Roles(Role.HR, Role.SUPER, Role.MANAGER, Role.EMPLOYEE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a leave request (HR/Manager/Employee with subordinates only)' })
  @ApiParam({ name: 'id', type: 'number', description: 'Leave request ID' })
  @ApiBody({ type: RejectLeaveRequestDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Leave request rejected successfully',
    type: LeaveRequestResponseDto
  })
  async rejectLeaveRequest(
    @Param('tenant_slug') tenantSlug: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() rejectDto: RejectLeaveRequestDto,
    @Request() req: any
  ): Promise<LeaveRequestResponseDto> {
    const userId = req.user.id;
    const employee = await this.employeeService.findByUserId(tenantSlug, userId);
    return this.leaveRequestService.rejectRequest(
      tenantSlug,
      id,
      Number(employee.id),
      req.user.role,
      rejectDto
    );
  }
}