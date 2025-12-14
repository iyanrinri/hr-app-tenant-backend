import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  FindAllEmployeesDto,
  SetManagerDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards';

@ApiTags('Employees')
@Controller(':tenant_slug/employees')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmployeesController {
  constructor(private employeesService: EmployeesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new employee',
    description:
      'Creates a new employee record with auto-generated user account',
  })
  @ApiResponse({
    status: 201,
    description: 'Employee created successfully',
  })
  async createEmployee(
    @Param('tenant_slug') tenantSlug: string,
    @Body() createEmployeeDto: CreateEmployeeDto,
  ) {
    return this.employeesService.createEmployee(
      tenantSlug,
      createEmployeeDto,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get all employees with filtering and pagination',
    description: 'Retrieves employees for the tenant with optional filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of employees',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by name, position, or department',
  })
  @ApiQuery({
    name: 'department',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'employmentStatus',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    example: 'firstName',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    enum: ['asc', 'desc'],
  })
  async getEmployees(
    @Param('tenant_slug') tenantSlug: string,
    @Query() findAllEmployeesDto: FindAllEmployeesDto,
  ) {
    return this.employeesService.getEmployees(tenantSlug, findAllEmployeesDto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get employee by ID',
    description: 'Retrieves complete employee profile with all details',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee profile details',
  })
  async getEmployee(
    @Param('tenant_slug') tenantSlug: string,
    @Param('id') employeeId: string,
  ) {
    return this.employeesService.getEmployee(tenantSlug, employeeId);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update employee information',
    description: 'Updates employee profile information',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee updated successfully',
  })
  async updateEmployee(
    @Param('tenant_slug') tenantSlug: string,
    @Param('id') employeeId: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.employeesService.updateEmployee(
      tenantSlug,
      employeeId,
      updateEmployeeDto,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete employee',
    description: 'Soft deletes an employee record',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee deleted successfully',
  })
  async deleteEmployee(
    @Param('tenant_slug') tenantSlug: string,
    @Param('id') employeeId: string,
  ) {
    return this.employeesService.deleteEmployee(tenantSlug, employeeId);
  }

  @Patch(':id/restore')
  @ApiOperation({
    summary: 'Restore deleted employee',
    description: 'Restores a soft-deleted employee record',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee restored successfully',
  })
  async restoreEmployee(
    @Param('tenant_slug') tenantSlug: string,
    @Param('id') employeeId: string,
  ) {
    return this.employeesService.restoreEmployee(tenantSlug, employeeId);
  }

  // Hierarchy Management Endpoints

  @Put(':id/manager')
  @ApiOperation({
    summary: 'Set employee manager',
    description: 'Assigns a manager to an employee (for hierarchy)',
  })
  @ApiResponse({
    status: 200,
    description: 'Manager assigned successfully',
  })
  async setManager(
    @Param('tenant_slug') tenantSlug: string,
    @Param('id') employeeId: string,
    @Body() setManagerDto: SetManagerDto,
  ) {
    return this.employeesService.setManager(
      tenantSlug,
      employeeId,
      setManagerDto,
    );
  }

  @Get(':id/subordinates')
  @ApiOperation({
    summary: 'Get direct subordinates',
    description: 'Retrieves list of employees reporting directly to this employee',
  })
  @ApiResponse({
    status: 200,
    description: 'List of subordinates',
  })
  async getSubordinates(
    @Param('tenant_slug') tenantSlug: string,
    @Param('id') employeeId: string,
  ) {
    return this.employeesService.getSubordinates(tenantSlug, employeeId);
  }

  @Get(':id/organization-tree')
  @ApiOperation({
    summary: 'Get organization tree',
    description: 'Retrieves complete organization tree starting from this employee',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization tree with all subordinates recursively',
  })
  async getOrganizationTree(
    @Param('tenant_slug') tenantSlug: string,
    @Param('id') employeeId: string,
  ) {
    return this.employeesService.getOrganizationTree(tenantSlug, employeeId);
  }

  @Get(':id/management-chain')
  @ApiOperation({
    summary: 'Get management chain',
    description: 'Retrieves the chain of command up to the top (manager -> manager\'s manager -> etc)',
  })
  @ApiResponse({
    status: 200,
    description: 'Management chain from employee to top',
  })
  async getManagementChain(
    @Param('tenant_slug') tenantSlug: string,
    @Param('id') employeeId: string,
  ) {
    return this.employeesService.getManagementChain(tenantSlug, employeeId);
  }
}
