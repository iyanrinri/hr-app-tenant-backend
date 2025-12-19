import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiBody, ApiParam } from '@nestjs/swagger';
import { OvertimeRequestService } from '../services/overtime-request.service';
import { CreateOvertimeRequestDto } from '../dto/create-overtime-request.dto';
import { UpdateOvertimeRequestDto } from '../dto/update-overtime-request.dto';
import { OvertimeRequestResponseDto, PaginatedOvertimeResponseDto } from '../dto/overtime-response.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('overtime-requests')
@Controller(':tenant_slug/overtime-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer')
export class OvertimeRequestController {
  constructor(private readonly overtimeRequestService: OvertimeRequestService) {}

  @Post()
  @Roles(Role.SUPER, Role.ADMIN, Role.HR, Role.MANAGER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Submit overtime request' })
  @ApiBody({
    type: CreateOvertimeRequestDto,
    description: 'Overtime request data',
    examples: {
      example1: {
        summary: 'Evening Overtime Request',
        description: 'Employee submitting overtime for evening work',
        value: {
          employeeId: 123,
          date: '2024-12-12',
          startTime: '2024-12-12T18:00:00Z',
          endTime: '2024-12-12T21:00:00Z',
          reason: 'System deployment and maintenance work'
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Overtime request submitted successfully', type: OvertimeRequestResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input data or business rule violation' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Param('tenant_slug') tenantSlug: string, 
    @Body() createOvertimeRequestDto: CreateOvertimeRequestDto,
    @Request() req: any
  ): Promise<OvertimeRequestResponseDto> {
    // Employees can only submit overtime for themselves
    // Override employeeId with the logged-in employee's ID for EMPLOYEE role
    if (req.user.role === Role.EMPLOYEE) {
      const employeeId = await this.overtimeRequestService.getEmployeeIdByUserId(tenantSlug, req.user.sub);
      if (!employeeId) {
        throw new Error('Employee record not found for this user');
      }
      createOvertimeRequestDto.employeeId = Number(employeeId);
    }
    
    return this.overtimeRequestService.create(tenantSlug, createOvertimeRequestDto);
  }

  @Get()
  @Roles(Role.SUPER, Role.ADMIN, Role.HR, Role.MANAGER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get overtime requests with filtering and pagination' })
  @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Number of records to skip' })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Number of records to take' })
  @ApiQuery({ name: 'employeeId', required: false, type: Number, description: 'Filter by employee ID' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Filter by start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Filter by end date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Overtime requests retrieved successfully', type: PaginatedOvertimeResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Param('tenant_slug') tenantSlug: string, 
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('employeeId', new ParseIntPipe({ optional: true })) employeeId?: number,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ): Promise<PaginatedOvertimeResponseDto> {
    return this.overtimeRequestService.findAll(tenantSlug, {
      skip,
      take,
      employeeId,
      status,
      startDate,
      endDate,
      userRole: req.user.role,
      userId: req.user.role === Role.EMPLOYEE ? Number(req.user.employee?.id) : undefined
    });
  }

  @Get('pending')
  @Roles(Role.SUPER, Role.ADMIN, Role.HR, Role.MANAGER)
  @ApiOperation({ summary: 'Get pending overtime requests (SUPER/HR/MANAGER only)' })
  @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Number of records to skip' })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Number of records to take' })
  @ApiResponse({ status: 200, description: 'Pending requests retrieved successfully', type: [OvertimeRequestResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - SUPER/HR/MANAGER role required' })
  async getPendingRequests(
    @Param('tenant_slug') tenantSlug: string, 
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Request() req?: any,
  ): Promise<OvertimeRequestResponseDto[]> {
    const managerId = req.user.role === Role.MANAGER ? Number(req.user.employee?.id) : undefined;
    
    return this.overtimeRequestService.getPendingRequests(tenantSlug, managerId, {
      skip,
      take
    });
  }

  @Get('employee/:employeeId/history')
  @Roles(Role.SUPER, Role.ADMIN, Role.HR, Role.MANAGER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get overtime history for specific employee' })
  @ApiParam({ name: 'employeeId', type: Number, description: 'Employee ID' })
  @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Number of records to skip' })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Number of records to take' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Filter by start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Filter by end date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Employee overtime history retrieved successfully', type: [OvertimeRequestResponseDto] })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getEmployeeHistory(
    @Param('tenant_slug') tenantSlug: string, 
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ): Promise<OvertimeRequestResponseDto[]> {
    // Employees can only view their own overtime history
    if (req.user.role === Role.EMPLOYEE && req.user.employee?.id !== employeeId.toString()) {
      throw new Error('Forbidden: You can only view your own overtime history');
    }
    
    return this.overtimeRequestService.getEmployeeOvertimeHistory(tenantSlug, employeeId, {
      skip,
      take,
      status,
      startDate,
      endDate
    });
  }

  @Get('employee/:employeeId/total-hours')
  @Roles(Role.SUPER, Role.ADMIN, Role.HR, Role.MANAGER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get total overtime hours for employee within date range' })
  @ApiParam({ name: 'employeeId', type: Number, description: 'Employee ID' })
  @ApiQuery({ name: 'startDate', required: true, type: String, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, type: String, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status (default: APPROVED)' })
  @ApiResponse({ status: 200, description: 'Total overtime hours calculated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid date range' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTotalOvertimeHours(
    @Param('tenant_slug') tenantSlug: string, 
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('status') status: string = 'APPROVED',
    @Request() req?: any,
  ): Promise<{ totalMinutes: number; totalHours: number }> {
    // Employees can only view their own overtime totals
    if (req.user.role === Role.EMPLOYEE && req.user.employee?.id !== employeeId.toString()) {
      throw new Error('Forbidden: You can only view your own overtime totals');
    }
    
    return this.overtimeRequestService.getTotalOvertimeHours(tenantSlug, employeeId, startDate, endDate, status);
  }

  @Get(':id')
  @Roles(Role.SUPER, Role.ADMIN, Role.HR, Role.MANAGER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get overtime request by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Overtime request ID' })
  @ApiResponse({ status: 200, description: 'Overtime request retrieved successfully', type: OvertimeRequestResponseDto })
  @ApiResponse({ status: 404, description: 'Overtime request not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(
    @Param('tenant_slug') tenantSlug: string, 
    @Param('id', ParseIntPipe) id: number,
    @Request() req?: any,
  ): Promise<OvertimeRequestResponseDto> {
    const overtimeRequest = await this.overtimeRequestService.findOne(tenantSlug, id);
    
    // Employees can only view their own overtime requests
    if (req.user.role === Role.EMPLOYEE && req.user.employee?.id !== overtimeRequest.employeeId) {
      throw new Error('Forbidden: You can only view your own overtime requests');
    }
    
    return overtimeRequest;
  }

  @Patch(':id')
  @Roles(Role.SUPER, Role.ADMIN, Role.HR, Role.MANAGER)
  @ApiOperation({ summary: 'Update overtime request (SUPER/HR/MANAGER only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Overtime request ID' })
  @ApiBody({ type: UpdateOvertimeRequestDto, description: 'Overtime request update data' })
  @ApiResponse({ status: 200, description: 'Overtime request updated successfully', type: OvertimeRequestResponseDto })
  @ApiResponse({ status: 404, description: 'Overtime request not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data or business rule violation' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - SUPER/HR/MANAGER role required' })
  async update(
    @Param('tenant_slug') tenantSlug: string, 
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOvertimeRequestDto: UpdateOvertimeRequestDto
  ): Promise<OvertimeRequestResponseDto> {
    return this.overtimeRequestService.update(tenantSlug, id, updateOvertimeRequestDto);
  }

  @Delete(':id')
  @Roles(Role.SUPER, Role.HR)
  @ApiOperation({ summary: 'Delete overtime request (SUPER/HR only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Overtime request ID' })
  @ApiResponse({ status: 200, description: 'Overtime request deleted successfully' })
  @ApiResponse({ status: 404, description: 'Overtime request not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete non-pending requests' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - SUPER/HR role required' })
  async remove(
    @Param('tenant_slug') tenantSlug: string, 
    @Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    await this.overtimeRequestService.remove(tenantSlug, id);
    return { message: `Overtime request with ID ${id} has been deleted successfully` };
  }
}
