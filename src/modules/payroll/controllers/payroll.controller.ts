import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards';
import { RolesGuard } from '@/common/guards';
import { Roles } from '../../../common/decorators/roles.decorator';
import { PayrollService } from '../services/payroll.service';
import { CreatePayrollDto, ProcessPayrollDto, BulkGeneratePayrollDto } from '../dto/create-payroll.dto';
import { PayrollQueryDto, PayrollStatus } from '../dto/payroll-query.dto';
import { PayrollDto, PayrollListResponseDto } from '../dto/payroll-response.dto';
import { Role } from '@prisma/client';
import { EmployeesService } from '../../employees/employees.service';

@ApiTags('Payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller(':tenant_slug/payroll')
export class PayrollController {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly employeesService: EmployeesService,
  ) {}

  @Post()
  @Roles(Role.SUPER, Role.ADMIN, Role.HR)
  @ApiOperation({
    summary: 'Create payroll record',
    description: 'Create a new payroll record for an employee with automatic overtime calculation and bonus percentage support',
  })
  @ApiResponse({
    status: 201,
    description: 'Payroll created successfully',
    type: PayrollDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or overlapping period',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async createPayroll(
    @Param('tenant_slug') tenantSlug: string,
    @Body() createPayrollDto: CreatePayrollDto,
    @Req() req: any,
  ): Promise<PayrollDto> {
    return this.payrollService.createPayroll(tenantSlug, createPayrollDto, req.user.userId);
  }

  @Post('bulk-generate')
  @Roles(Role.SUPER, Role.ADMIN, Role.HR)
  @ApiOperation({
    summary: 'Bulk generate payroll for all employees',
    description: 'Generate payroll for all active employees (or specific ones) with one click. Automatically calculates overtime and applies bonus percentage. Deductions are manual per employee.',
  })
  @ApiResponse({
    status: 201,
    description: 'Payrolls generated successfully',
    schema: {
      properties: {
        generated: { type: 'number', example: 10 },
        failed: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              employeeId: { type: 'string' },
              reason: { type: 'string' },
            },
          },
        },
        payrolls: {
          type: 'array',
          items: { $ref: '#/components/schemas/PayrollDto' },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async bulkGeneratePayroll(
    @Param('tenant_slug') tenantSlug: string,
    @Body() bulkGenerateDto: BulkGeneratePayrollDto,
    @Req() req: any,
  ) {
    return this.payrollService.bulkGeneratePayroll(tenantSlug, bulkGenerateDto, req.user.userId);
  }

  @Get()
  @Roles(Role.SUPER, Role.ADMIN, Role.HR, Role.MANAGER)
  @ApiOperation({
    summary: 'Get payroll records',
    description: 'Retrieve paginated list of payroll records with filtering options',
  })
  @ApiResponse({
    status: 200,
    description: 'Payroll records retrieved successfully',
    type: PayrollListResponseDto,
  })
  @ApiQuery({
    name: 'employeeId',
    required: false,
    description: 'Filter by employee ID',
  })
  @ApiQuery({
    name: 'department',
    required: false,
    description: 'Filter by department',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: PayrollStatus,
    description: 'Filter by payroll status',
  })
  @ApiQuery({
    name: 'periodStartFrom',
    required: false,
    description: 'Filter by period start date (from)',
  })
  @ApiQuery({
    name: 'periodStartTo',
    required: false,
    description: 'Filter by period start date (to)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
    example: 10,
  })
  async findAll(
    @Param('tenant_slug') tenantSlug: string, @Query() query: PayrollQueryDto): Promise<PayrollListResponseDto> {
    return this.payrollService.findAll(tenantSlug, query);
  }

  @Get('summary')
  @Roles(Role.SUPER, Role.ADMIN, Role.HR)
  @ApiOperation({
    summary: 'Get payroll summary',
    description: 'Retrieve aggregated payroll statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Payroll summary retrieved successfully',
  })
  @ApiQuery({
    name: 'employeeId',
    required: false,
    description: 'Filter summary by employee ID',
  })
  async getPayrollSummary(
    @Param('tenant_slug') tenantSlug: string, @Query('employeeId') employeeId?: string) {
    return this.payrollService.getPayrollSummary(tenantSlug, employeeId);
  }

  @Get('my')
  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @ApiOperation({
    summary: 'Get own payroll records',
    description: 'Retrieve payroll records for the authenticated employee',
  })
  @ApiResponse({
    status: 200,
    description: 'Own payroll records retrieved successfully',
    type: PayrollListResponseDto,
  })
  async getMyPayrolls(
    @Param('tenant_slug') tenantSlug: string, 
    @Query() query: PayrollQueryDto,
    @Req() req: any,
  ): Promise<PayrollListResponseDto> {
    const modifiedQuery = {
      ...query,
      employeeId: req.user.employee?.id?.toString(),
    };
    return this.payrollService.findAll(tenantSlug,modifiedQuery);
  }

  @Get('employee/:employeeId')
  @Roles(Role.SUPER, Role.ADMIN, Role.HR, Role.MANAGER)
  @ApiOperation({
    summary: 'Get payroll by employee ID',
    description: 'Retrieve payroll records for a specific employee',
  })
  @ApiParam({
    name: 'employeeId',
    description: 'Employee ID',
    example: '1',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Employee payroll records retrieved successfully',
    type: PayrollListResponseDto,
  })
  async getEmployeePayrolls(
    @Param('tenant_slug') tenantSlug: string,
    @Param('employeeId') employeeId: string,
    @Query() query: PayrollQueryDto,
  ): Promise<PayrollListResponseDto> {
    const modifiedQuery = {
      ...query,
      employeeId: employeeId,
    };
    return this.payrollService.findAll(tenantSlug, modifiedQuery);
  }

  @Get(':id')
  @Roles(Role.SUPER, Role.ADMIN, Role.HR, Role.MANAGER, Role.EMPLOYEE)
  @ApiOperation({
    summary: 'Get payroll by ID',
    description: 'Retrieve a specific payroll record by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Payroll ID',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Payroll found',
    type: PayrollDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Payroll not found',
  })
  async findById(
    @Param('tenant_slug') tenantSlug: string, 
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<PayrollDto> {
    const payroll = await this.payrollService.findById(tenantSlug,id);
    
    // Employees can only view their own payroll
    if (req.user.role === Role.EMPLOYEE) {
      let employeeId = req.user.employee?.id?.toString();
      
      // If employeeId not in JWT, verify ownership via employee's userId
      if (!employeeId) {
        try {
          const employee = await this.employeesService.getEmployee(tenantSlug, payroll.employeeId);
          
          // Check if employee's userId matches the requesting user's ID
          if (!employee || !employee.userId || employee.userId.toString() !== req.user.id.toString()) {
            throw new ForbiddenException('You can only view your own payroll');
          }
          // User owns this employee record, allow access
        } catch (error) {
          throw new ForbiddenException('You can only view your own payroll');
        }
      } else if (payroll.employeeId !== employeeId) {
        throw new ForbiddenException('You can only view your own payroll');
      }
    }
    
    return payroll;
  }

  @Put('process')
  @Roles(Role.SUPER, Role.ADMIN, Role.HR)
  @ApiOperation({
    summary: 'Process payroll records',
    description: 'Mark multiple payroll records as processed',
  })
  @ApiResponse({
    status: 200,
    description: 'Payrolls processed successfully',
  })
  async processPayrolls(
    @Param('tenant_slug') tenantSlug: string, 
    @Body() processPayrollDto: ProcessPayrollDto,
    @Req() req: any,
  ) {
    return this.payrollService.processPayrolls(tenantSlug, processPayrollDto, req.user.userId);
  }

  @Put(':id/mark-paid')
  @Roles(Role.SUPER, Role.ADMIN, Role.HR)
  @ApiOperation({
    summary: 'Mark payroll as paid',
    description: 'Mark a payroll record as paid',
  })
  @ApiParam({
    name: 'id',
    description: 'Payroll ID',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Payroll marked as paid successfully',
    type: PayrollDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - payroll already paid or not processed',
  })
  @ApiResponse({
    status: 404,
    description: 'Payroll not found',
  })
  async markAsPaid(
    @Param('tenant_slug') tenantSlug: string, 
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<PayrollDto> {
    return this.payrollService.markAsPaid(tenantSlug, id, req.user.userId);
  }

  @Delete(':id')
  @Roles(Role.SUPER, Role.ADMIN, Role.HR)
  @ApiOperation({
    summary: 'Delete payroll record',
    description: 'Delete a payroll record (only unpaid records can be deleted)',
  })
  @ApiParam({
    name: 'id',
    description: 'Payroll ID',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Payroll deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - cannot delete paid payroll',
  })
  @ApiResponse({
    status: 404,
    description: 'Payroll not found',
  })
  async deletePayroll(
    @Param('tenant_slug') tenantSlug: string, 
    @Param('id') id: string): Promise<{ message: string }> {
    await this.payrollService.deletePayroll(tenantSlug, id);
    return { message: 'Payroll deleted successfully' };
  }
}