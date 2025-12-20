import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiBody, ApiParam } from '@nestjs/swagger';
import { SalaryService } from '../services/salary.service';
import { CreateSalaryDto } from '../dto/create-salary.dto';
import { UpdateSalaryDto } from '../dto/update-salary.dto';
import { SalaryResponseDto } from '../dto/salary-response.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('salaries')
@Controller(':tenant_slug/salaries')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer')
export class SalaryController {
  constructor(private readonly salaryService: SalaryService) {}

  @Post()
  @Roles(Role.SUPER, Role.ADMIN,  Role.HR)
  @ApiOperation({ summary: 'Create salary record (SUPER/HR only)' })
  @ApiBody({
    type: CreateSalaryDto,
    description: 'Salary creation data',
    examples: {
      example1: {
        summary: 'New Employee Salary',
        description: 'Initial salary setup for new employee',
        value: {
          employeeId: 123,
          baseSalary: 5000000,
          allowances: 500000,
          grade: 'Grade 5',
          effectiveDate: '2024-01-01',
          createdBy: 1
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Salary created successfully', type: SalaryResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - SUPER/HR role required' })
  async create(
    @Param('tenant_slug') tenantSlug: string, 
    @Body() createSalaryDto: CreateSalaryDto): Promise<SalaryResponseDto> {
    return this.salaryService.create(tenantSlug, createSalaryDto);
  }

  @Get()
  @Roles(Role.SUPER, Role.ADMIN,  Role.HR, Role.MANAGER)
  @ApiOperation({ summary: 'Get all salaries with filtering and pagination (SUPER/HR/MANAGER only)' })
  @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Number of records to skip' })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Number of records to take' })
  @ApiQuery({ name: 'employeeId', required: false, type: Number, description: 'Filter by employee ID' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiQuery({ name: 'grade', required: false, type: String, description: 'Filter by salary grade' })
  @ApiResponse({ status: 200, description: 'Salaries retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - SUPER/HR/MANAGER role required' })
  async findAll(
    @Param('tenant_slug') tenantSlug: string,
    @Query('skip', ParseIntPipe) skip?: number,
    @Query('take', ParseIntPipe) take?: number,
    @Query('employeeId', ParseIntPipe) employeeId?: number,
    @Query('isActive') isActive?: boolean,
    @Query('grade') grade?: string,
  ) {
    return this.salaryService.findAll(tenantSlug, {
      skip,
      take,
      employeeId,
      isActive: isActive !== undefined ? isActive === true : undefined,
      grade
    });
  }

  @Get('employee/:employeeId/current')
  @Roles(Role.SUPER, Role.ADMIN,  Role.HR, Role.MANAGER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get current salary for employee' })
  @ApiParam({ name: 'employeeId', type: Number, description: 'Employee ID' })
  @ApiResponse({ status: 200, description: 'Current salary retrieved successfully', type: SalaryResponseDto })
  @ApiResponse({ status: 404, description: 'No active salary found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentSalary(
    @Param('tenant_slug') tenantSlug: string, 
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Request() req: any
  ): Promise<SalaryResponseDto> {
    // Employees can only view their own salary
    if (req.user.role === Role.EMPLOYEE && req.user.employee?.id !== employeeId.toString()) {
      throw new Error('Forbidden: You can only view your own salary');
    }
    
    return this.salaryService.getCurrentSalary(tenantSlug,employeeId);
  }

  @Get('employee/:employeeId/history')
  @Roles(Role.SUPER, Role.ADMIN,  Role.HR, Role.MANAGER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get salary history for employee' })
  @ApiParam({ name: 'employeeId', type: Number, description: 'Employee ID' })
  @ApiResponse({ status: 200, description: 'Salary history retrieved successfully', type: [SalaryResponseDto] })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getEmployeeSalaryHistory(
    @Param('tenant_slug') tenantSlug: string, 
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Request() req: any
  ): Promise<SalaryResponseDto[]> {
    // Employees can only view their own salary history
    if (req.user.role === Role.EMPLOYEE && req.user.employee?.id !== employeeId.toString()) {
      throw new Error('Forbidden: You can only view your own salary history');
    }
    
    return this.salaryService.getEmployeeSalaryHistory(tenantSlug, employeeId);
  }

  @Get(':id')
  @Roles(Role.SUPER, Role.ADMIN,  Role.HR, Role.MANAGER)
  @ApiOperation({ summary: 'Get salary by ID (SUPER/HR/MANAGER only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Salary ID' })
  @ApiResponse({ status: 200, description: 'Salary retrieved successfully', type: SalaryResponseDto })
  @ApiResponse({ status: 404, description: 'Salary not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - SUPER/HR/MANAGER role required' })
  async findOne(
    @Param('tenant_slug') tenantSlug: string, 
    @Param('id', ParseIntPipe) id: number): Promise<SalaryResponseDto> {
    return this.salaryService.findOne(tenantSlug, id);
  }

  @Patch(':id')
  @Roles(Role.SUPER, Role.ADMIN,  Role.HR)
  @ApiOperation({ summary: 'Update salary (SUPER/HR only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Salary ID' })
  @ApiBody({ type: UpdateSalaryDto, description: 'Salary update data' })
  @ApiResponse({ status: 200, description: 'Salary updated successfully', type: SalaryResponseDto })
  @ApiResponse({ status: 404, description: 'Salary not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - SUPER/HR role required' })
  async update(
    @Param('tenant_slug') tenantSlug: string, 
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSalaryDto: UpdateSalaryDto
  ): Promise<SalaryResponseDto> {
    return this.salaryService.update(tenantSlug, id, updateSalaryDto);
  }

  @Delete(':id')
  @Roles(Role.SUPER)
  @ApiOperation({ summary: 'Delete salary (SUPER only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Salary ID' })
  @ApiResponse({ status: 200, description: 'Salary deleted successfully' })
  @ApiResponse({ status: 404, description: 'Salary not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - SUPER role required' })
  async remove(
    @Param('tenant_slug') tenantSlug: string, 
    @Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    await this.salaryService.remove(tenantSlug, id);
    return { message: `Salary with ID ${id} has been deleted successfully` };
  }
}
