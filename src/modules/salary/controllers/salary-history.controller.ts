import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiBody, ApiParam } from '@nestjs/swagger';
import { SalaryHistoryService } from '../services/salary-history.service';
import { CreateSalaryHistoryDto } from '../dto/create-salary-history.dto';
import { SalaryHistoryResponseDto } from '../dto/salary-response.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('salary-history')
@Controller('salary-history')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer')
export class SalaryHistoryController {
  constructor(private readonly salaryHistoryService: SalaryHistoryService) {}

  @Post()
  @Roles(Role.SUPER, Role.ADMIN,  Role.HR)
  @ApiOperation({ summary: 'Create salary history record (SUPER/HR only)' })
  @ApiBody({
    type: CreateSalaryHistoryDto,
    description: 'Salary history creation data',
    examples: {
      example1: {
        summary: 'Promotion Record',
        description: 'Record of salary change due to promotion',
        value: {
          employeeId: 123,
          changeType: 'PROMOTION',
          oldBaseSalary: 5000000,
          newBaseSalary: 6000000,
          oldGrade: 'Grade 5',
          newGrade: 'Grade 6',
          oldPosition: 'Software Engineer',
          newPosition: 'Senior Software Engineer',
          reason: 'Promoted to senior position based on performance',
          effectiveDate: '2024-01-01',
          approvedBy: 1
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Salary history created successfully', type: SalaryHistoryResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - SUPER/HR role required' })
  async create(
    @Param('tenant_slug') tenantSlug: string, 
    @Body() createSalaryHistoryDto: CreateSalaryHistoryDto): Promise<SalaryHistoryResponseDto> {
    return this.salaryHistoryService.create(tenantSlug, createSalaryHistoryDto);
  }

  @Get()
  @Roles(Role.SUPER, Role.ADMIN,  Role.HR, Role.MANAGER)
  @ApiOperation({ summary: 'Get salary history with filtering and pagination (SUPER/HR/MANAGER only)' })
  @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Number of records to skip' })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Number of records to take' })
  @ApiQuery({ name: 'employeeId', required: false, type: Number, description: 'Filter by employee ID' })
  @ApiQuery({ name: 'changeType', required: false, type: String, description: 'Filter by change type' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Filter by start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Filter by end date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Salary history retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - SUPER/HR/MANAGER role required' })
  async findAll(
    @Param('tenant_slug') tenantSlug: string, 
    @Query('skip', ParseIntPipe) skip?: number,
    @Query('take', ParseIntPipe) take?: number,
    @Query('employeeId', ParseIntPipe) employeeId?: number,
    @Query('changeType') changeType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.salaryHistoryService.findAll(tenantSlug, {
      skip,
      take,
      employeeId,
      changeType,
      startDate,
      endDate
    });
  }

  @Get('employee/:employeeId')
  @Roles(Role.SUPER, Role.ADMIN,  Role.HR, Role.MANAGER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get salary history for specific employee' })
  @ApiParam({ name: 'employeeId', type: Number, description: 'Employee ID' })
  @ApiResponse({ status: 200, description: 'Employee salary history retrieved successfully', type: [SalaryHistoryResponseDto] })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getEmployeeHistory(
    @Param('tenant_slug') tenantSlug: string, 
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Request() req: any
  ): Promise<SalaryHistoryResponseDto[]> {
    // Employees can only view their own salary history
    if (req.user.role === Role.EMPLOYEE && req.user.employee?.id !== employeeId.toString()) {
      throw new Error('Forbidden: You can only view your own salary history');
    }
    
    return this.salaryHistoryService.getEmployeeHistory(tenantSlug, employeeId);
  }

  @Get('employee/:employeeId/date-range')
  @Roles(Role.SUPER, Role.ADMIN,  Role.HR, Role.MANAGER)
  @ApiOperation({ summary: 'Get salary history for employee within date range (SUPER/HR/MANAGER only)' })
  @ApiParam({ name: 'employeeId', type: Number, description: 'Employee ID' })
  @ApiQuery({ name: 'startDate', required: true, type: String, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, type: String, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Salary history within date range retrieved successfully', type: [SalaryHistoryResponseDto] })
  @ApiResponse({ status: 400, description: 'Invalid date range' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - SUPER/HR/MANAGER role required' })
  async getByDateRange(
    @Param('tenant_slug') tenantSlug: string, 
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<SalaryHistoryResponseDto[]> {
    return this.salaryHistoryService.getByDateRange(tenantSlug, employeeId, startDate, endDate);
  }

  @Get('change-type/:changeType')
  @Roles(Role.SUPER, Role.ADMIN,  Role.HR)
  @ApiOperation({ summary: 'Get salary history by change type (SUPER/HR only)' })
  @ApiParam({ name: 'changeType', type: String, description: 'Change type (PROMOTION, GRADE_ADJUSTMENT, etc.)' })
  @ApiResponse({ status: 200, description: 'Salary history by change type retrieved successfully', type: [SalaryHistoryResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - SUPER/HR role required' })
  async getByChangeType(
    @Param('tenant_slug') tenantSlug: string, @Param('changeType') changeType: string): Promise<SalaryHistoryResponseDto[]> {
    return this.salaryHistoryService.getByChangeType(tenantSlug, changeType);
  }

  @Get(':id')
  @Roles(Role.SUPER, Role.ADMIN,  Role.HR, Role.MANAGER)
  @ApiOperation({ summary: 'Get salary history by ID (SUPER/HR/MANAGER only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Salary history ID' })
  @ApiResponse({ status: 200, description: 'Salary history retrieved successfully', type: SalaryHistoryResponseDto })
  @ApiResponse({ status: 404, description: 'Salary history not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - SUPER/HR/MANAGER role required' })
  async findOne(
    @Param('tenant_slug') tenantSlug: string, @Param('id', ParseIntPipe) id: number): Promise<SalaryHistoryResponseDto> {
    return this.salaryHistoryService.findOne(tenantSlug, id);
  }
}
